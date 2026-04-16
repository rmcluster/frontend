import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { InstalledModelsTable } from '../components/models/InstalledModelsTable';
import { LocalModelModal } from '../components/models/LocalModelModal';
import { ModelSearchResultsTable } from '../components/models/ModelSearchResultsTable';
import { PageHeader } from '../components/PageHeader';
import { getJson, postForm, postJson } from '../lib/api';
import type { Model, SearchResult } from '../types/ui';

export function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localName, setLocalName] = useState('');
  const [localParameters, setLocalParameters] = useState('');
  const [localQuantization, setLocalQuantization] = useState('');
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = await getJson<{ models: Model[] }>('/api/ui/models');
      setModels(payload.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadModels(); }, []);

  const canUseLocalFile = useMemo(
    () => localFile && localFile.name.endsWith('.gguf'),
    [localFile]
  );

  const onSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) { setSearchResults([]); return; }
    try {
      setSearching(true);
      const url = `/api/ui/models/search?q=${encodeURIComponent(query.trim())}`;
      const payload = await getJson<{ results: SearchResult[] }>(url);
      setSearchResults(payload.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const addHfModel = async (model: string) => {
    try {
      await postJson('/api/ui/models/hf', { model });
      await loadModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add model');
    }
  };

  const saveLocalModel = async (event: FormEvent) => {
    event.preventDefault();
    if (!localFile || !canUseLocalFile) { setError('Select a .gguf file'); return; }
    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('model_file', localFile);
      formData.append('name', localName);
      formData.append('parameters', localParameters);
      formData.append('quantization', localQuantization);
      await postForm('/api/ui/models/local', formData);
      setDialogOpen(false);
      setLocalFile(null);
      setLocalName('');
      setLocalParameters('');
      setLocalQuantization('');
      await loadModels();
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
            className="btn btn-secondary"
            onClick={() => setDialogOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add local model
          </button>
        }
      />

      {/* Search */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <form className="models-search-row" onSubmit={onSearch}>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search HuggingFace repos or paste owner/repo…"
          />
          <button type="submit" className="btn btn-primary" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>
        {error && (
          <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '12px' }}>{error}</p>
        )}
      </div>

      <ModelSearchResultsTable results={searchResults} onAdd={addHfModel} />
      <InstalledModelsTable models={models} loading={loading} />

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
