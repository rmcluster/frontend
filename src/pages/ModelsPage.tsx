import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InstalledModelsTable } from '../components/models/InstalledModelsTable';
import { LocalModelModal } from '../components/models/LocalModelModal';
import { ModelSearchResultsTable } from '../components/models/ModelSearchResultsTable';
import { PageHeader } from '../components/PageHeader';
import { useModels } from '../context/ModelsContext';
import { getJson, postForm, postJson } from '../lib/api';
import {
  hfRepoFromModelRef,
  isModelCached as checkModelCached,
  type ModelCacheStatus,
} from '../lib/modelCache';
import { apiRoutes } from '../lib/routes';
import type { Model, SearchResult } from '../types/ui';

const PREFETCH_POLL_MS = 3000;
const PREFETCH_POLL_MAX_MS = 10 * 60_000;

function filterSearchResults(results: SearchResult[], models: Model[]): SearchResult[] {
  const knownRepos = new Set<string>();
  for (const model of models) {
    const repo = hfRepoFromModelRef(model.model);
    if (repo) knownRepos.add(repo);
  }
  return results.filter((item) => {
    const repo = hfRepoFromModelRef(item.model);
    return !repo || !knownRepos.has(repo);
  });
}

function usePrefetchAfterAdd(options?: {
  onPrefetchTimeout?: (modelRef: string) => void;
}) {
  const { refreshModels, isModelCached } = useModels();
  const [prefetching, setPrefetching] = useState<Set<string>>(() => new Set());
  const pollTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map()
  );
  const pollStartedRef = useRef<Map<string, number>>(new Map());

  const clearPrefetchPoll = useCallback((modelRef: string) => {
    const timer = pollTimersRef.current.get(modelRef);
    if (timer) {
      clearInterval(timer);
      pollTimersRef.current.delete(modelRef);
    }
    pollStartedRef.current.delete(modelRef);
  }, []);

  useEffect(
    () => () => {
      for (const timer of pollTimersRef.current.values()) {
        clearInterval(timer);
      }
      pollTimersRef.current.clear();
      pollStartedRef.current.clear();
    },
    []
  );

  const prefetchAfterAdd = useCallback(
    (modelRef: string) => {
      setPrefetching((prev) => new Set(prev).add(modelRef));
      clearPrefetchPoll(modelRef);
      pollStartedRef.current.set(modelRef, Date.now());

      const tick = async () => {
        try {
          const payload = await refreshModels();
          if (checkModelCached(modelRef, payload.cache ?? [])) {
            setPrefetching((prev) => {
              const next = new Set(prev);
              next.delete(modelRef);
              return next;
            });
            clearPrefetchPoll(modelRef);
          } else if (
            Date.now() - (pollStartedRef.current.get(modelRef) ?? 0) >=
            PREFETCH_POLL_MAX_MS
          ) {
            setPrefetching((prev) => {
              const next = new Set(prev);
              next.delete(modelRef);
              return next;
            });
            clearPrefetchPoll(modelRef);
            options?.onPrefetchTimeout?.(modelRef);
          }
        } catch {
          // keep polling until timeout
        }
      };

      void tick();
      pollTimersRef.current.set(
        modelRef,
        setInterval(() => {
          void tick();
        }, PREFETCH_POLL_MS)
      );
    },
    [refreshModels, clearPrefetchPoll, options]
  );

  const getModelStatus = useCallback(
    (modelRef: string): ModelCacheStatus => {
      if (prefetching.has(modelRef)) return 'prefetching';
      if (isModelCached(modelRef)) return 'ready';
      return 'not_cached';
    },
    [prefetching, isModelCached]
  );

  return { prefetchAfterAdd, getModelStatus };
}

export function ModelsPage() {
  const { models, loading, refreshModels } = useModels();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localName, setLocalName] = useState('');
  const [localParameters, setLocalParameters] = useState('');
  const [localQuantization, setLocalQuantization] = useState('');
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { prefetchAfterAdd, getModelStatus } = usePrefetchAfterAdd({
    onPrefetchTimeout: (modelRef) => {
      setError(`Download failed for ${modelRef}. Try again later.`);
    },
  });

  const canUseLocalFile = useMemo(
    () => localFile && localFile.name.endsWith('.gguf'),
    [localFile]
  );

  const onSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      setError(null);
      const url = `${apiRoutes.uiModelsSearch}?q=${encodeURIComponent(query.trim())}`;
      const payload = await getJson<{ results: SearchResult[] }>(url);
      setSearchResults(filterSearchResults(payload.results, models));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const addHfModel = async (model: string) => {
    try {
      setError(null);
      await postJson(apiRoutes.uiModelsHF, { model });
      setSearchResults((prev) => prev.filter((item) => item.model !== model));
      await refreshModels();
      prefetchAfterAdd(model);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add model');
    }
  };

  const prefetchInstalledModel = async (model: string) => {
    try {
      setError(null);
      await postJson(apiRoutes.uiModelsHF, { model });
      await refreshModels();
      prefetchAfterAdd(model);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download model');
    }
  };

  const saveLocalModel = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!localFile || !canUseLocalFile) {
      setError('Select a .gguf file');
      return;
    }
    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('model_file', localFile);
      formData.append('name', localName);
      formData.append('parameters', localParameters);
      formData.append('quantization', localQuantization);
      await postForm(apiRoutes.uiModelsLocal, formData);
      setDialogOpen(false);
      setLocalFile(null);
      setLocalName('');
      setLocalParameters('');
      setLocalQuantization('');
      await refreshModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Models"
        subtitle="Search Hugging Face for GGUF models or upload from local disk."
        actions={
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer outline-none"
            onClick={() => setDialogOpen(true)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add local model
          </button>
        }
      />

      <form className="flex gap-3 items-stretch flex-wrap mb-6" onSubmit={onSearch}>
        <input
          className="flex-1 min-w-50 px-3 py-2 text-sm bg-(--bg-surface) border border-(--border) rounded-md text-(--text-primary) placeholder:text-(--text-muted) outline-none focus:border-(--border-focus) transition-colors"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search HuggingFace repos or paste owner/repo…"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--accent) text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={searching}
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>
      {error && (
        <p className="text-(--danger) text-sm mb-4">
          {error}
        </p>
      )}

      <ModelSearchResultsTable results={searchResults} onAdd={addHfModel} />
      <InstalledModelsTable
        getModelStatus={getModelStatus}
        onPrefetch={prefetchInstalledModel}
      />

      <LocalModelModal
        open={dialogOpen}
        localName={localName}
        localParameters={localParameters}
        localQuantization={localQuantization}
        uploading={uploading}
        canUseLocalFile={!!canUseLocalFile}
        onClose={() => setDialogOpen(false)}
        onSave={saveLocalModel}
        onNameChange={setLocalName}
        onParametersChange={setLocalParameters}
        onQuantizationChange={setLocalQuantization}
        onFileChange={setLocalFile}
      />
    </>
  );
}
