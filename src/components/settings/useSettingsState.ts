import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getLoadingStatus,
  getParallelismTarget,
  getStorageChunkSize,
  setParallelismTarget,
  setStorageChunkSize,
} from '../../lib/api';

export type SettingsDraft = {
  parallelism: string;
  chunkSize: string;
};

export type SettingsState = {
  nodeCount: number;
  chunkSizeAvailable: boolean;
  draft: SettingsDraft;
  saved: SettingsDraft;
  loading: boolean;
  savePending: boolean;
  loadError: string;
  saveError: string;
  chunkSizeHint: string;
};

export type SettingsActions = {
  updateDraft: (patch: Partial<SettingsDraft>) => void;
};

export const MIN_CHUNK_SIZE_MIB = 1;
export const MAX_CHUNK_SIZE_MIB = 1024;
const BYTES_PER_MIB = 1024 * 1024;
const SAVE_DEBOUNCE_MS = 450;

const createDefaultDraft = (): SettingsDraft => ({ parallelism: '1', chunkSize: '8' });

function maybeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to save settings.';
}

export function useSettingsState(open: boolean): SettingsState & SettingsActions {
  const [nodeCount, setNodeCount] = useState(0);
  const [chunkSizeAvailable, setChunkSizeAvailable] = useState(true);
  const [draft, setDraft] = useState<SettingsDraft>(createDefaultDraft);
  const [saved, setSaved] = useState<SettingsDraft>(createDefaultDraft);
  const [loading, setLoading] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');

  const chunkSizeHint = useMemo(() => {
    const parsed = Number(draft.chunkSize);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return '';
    }
    return `${parsed * BYTES_PER_MIB} bytes`;
  }, [draft.chunkSize]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setSaveError('');
    setChunkSizeAvailable(true);

    try {
      const [parallelism, loadingStatus, chunkSizeResult] = await Promise.all([
        getParallelismTarget(),
        getLoadingStatus(),
        getStorageChunkSize()
          .then((value) => ({ ok: true as const, value }))
          .catch(() => ({ ok: false as const })),
      ]);

      const nextDraft: SettingsDraft = {
        parallelism: String(parallelism.parallelism_target),
        chunkSize: createDefaultDraft().chunkSize,
      };

      setNodeCount(loadingStatus.node_count);

      if (chunkSizeResult.ok) {
        nextDraft.chunkSize = String(
          Math.round(chunkSizeResult.value.chunk_size_bytes / BYTES_PER_MIB)
        );
      } else {
        setChunkSizeAvailable(false);
      }

      setDraft(nextDraft);
      setSaved(nextDraft);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadSettings();
  }, [open, loadSettings]);

  const validateDraft = useCallback(
    (value: SettingsDraft): string | null => {
      const nextParallelism = Number(value.parallelism);
      if (!Number.isInteger(nextParallelism) || nextParallelism < 1) {
        return 'Parallelism target must be a whole number >= 1.';
      }

      if (!chunkSizeAvailable) {
        return null;
      }

      const nextChunkSizeMiB = Number(value.chunkSize);
      if (
        !Number.isInteger(nextChunkSizeMiB) ||
        nextChunkSizeMiB < MIN_CHUNK_SIZE_MIB ||
        nextChunkSizeMiB > MAX_CHUNK_SIZE_MIB
      ) {
        return `Chunk size must be a whole number between ${MIN_CHUNK_SIZE_MIB} and ${MAX_CHUNK_SIZE_MIB} MiB.`;
      }

      return null;
    },
    [chunkSizeAvailable]
  );

  const saveDraft = useCallback(
    async (value: SettingsDraft) => {
      const validationError = validateDraft(value);
      if (validationError) {
        setSaveError(validationError);
        return;
      }

      setSavePending(true);

      try {
        const parallelism = await setParallelismTarget(Number(value.parallelism));
        let nextChunkSize = value.chunkSize;

        if (chunkSizeAvailable) {
          const chunkSize = await setStorageChunkSize(Number(value.chunkSize) * BYTES_PER_MIB);
          nextChunkSize = String(Math.round(chunkSize.chunk_size_bytes / BYTES_PER_MIB));
        }

        const nextSaved = {
          parallelism: String(parallelism.parallelism_target),
          chunkSize: nextChunkSize,
        };

        setDraft(nextSaved);
        setSaved(nextSaved);
        setSaveError('');
      } catch (error) {
        setSaveError(maybeErrorMessage(error));
      } finally {
        setSavePending(false);
      }
    },
    [chunkSizeAvailable, validateDraft]
  );

  useEffect(() => {
    if (!open || loading || savePending || loadError) {
      return;
    }
    if (
      draft.parallelism === saved.parallelism &&
      (!chunkSizeAvailable || draft.chunkSize === saved.chunkSize)
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveDraft(draft);
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [open, loading, savePending, loadError, draft, saved, chunkSizeAvailable, saveDraft]);

  const updateDraft = useCallback((patch: Partial<SettingsDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  return {
    nodeCount,
    chunkSizeAvailable,
    draft,
    saved,
    loading,
    savePending,
    loadError,
    saveError,
    chunkSizeHint,
    updateDraft,
  };
}
