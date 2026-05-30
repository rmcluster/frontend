import { useEffect, useMemo, useState } from 'react';
import { Workflow, X } from 'lucide-react';
import {
  getLoadingStatus,
  getParallelismTarget,
  getStorageChunkSize,
  setParallelismTarget,
  setStorageChunkSize,
} from '../../lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

type SettingsDraft = {
  parallelism: string;
  chunkSize: string;
};

const MIN_CHUNK_SIZE_MIB = 1;
const MAX_CHUNK_SIZE_MIB = 1024;
const BYTES_PER_MIB = 1024 * 1024;
const SAVE_DEBOUNCE_MS = 450;

function maybeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to save settings.';
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [nodeCount, setNodeCount] = useState(0);
  const [chunkSizeAvailable, setChunkSizeAvailable] = useState(true);
  const [draft, setDraft] = useState<SettingsDraft>({ parallelism: '1', chunkSize: '8' });
  const [saved, setSaved] = useState<SettingsDraft>({ parallelism: '1', chunkSize: '8' });
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

  const loadSettings = async () => {
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
        chunkSize: draft.chunkSize,
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
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadSettings();
  }, [open]);

  const validateDraft = (value: SettingsDraft): string | null => {
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
  };

  const saveDraft = async (value: SettingsDraft) => {
    const validationError = validateDraft(value);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setSavePending(true);
    setSaveError('');

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
    } catch (error) {
      setSaveError(maybeErrorMessage(error));
    } finally {
      setSavePending(false);
    }
  };

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
  }, [open, loading, savePending, loadError, draft, saved, chunkSizeAvailable]);

  const updateDraft = (patch: Partial<SettingsDraft>) => {
    setSaveError('');
    setDraft((current) => ({ ...current, ...patch }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent maxWidth="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>Settings</DialogTitle>
              <DialogDescription>Advanced config options.</DialogDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-(--text-muted) transition-colors hover:bg-(--bg-elevated) hover:text-(--text-primary) cursor-pointer"
              aria-label="Close settings"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-16 text-center text-sm text-[var(--text-muted)]">
            Loading settings…
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-dim)] px-4 py-3 text-sm text-[var(--danger)]">
            {loadError}
          </div>
        ) : (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]/55 p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
                <Workflow size={18} />
              </span>
              <div>
                <h3 className="font-[var(--font-heading)] text-sm font-semibold text-[var(--text-primary)]">
                  Cluster tuning
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Changes save automatically as you edit.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Parallelism target
                </span>
                <input
                  type="number"
                  min={1}
                  max={nodeCount}
                  step={1}
                  inputMode="numeric"
                  value={draft.parallelism}
                  onChange={(event) => updateDraft({ parallelism: event.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-focus)]"
                />
                <span className="text-xs text-[var(--text-muted)]">
                  {nodeCount} connected node{nodeCount === 1 ? '' : 's'}
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Chunk size
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min={MIN_CHUNK_SIZE_MIB}
                    max={MAX_CHUNK_SIZE_MIB}
                    step={1}
                    inputMode="numeric"
                    value={draft.chunkSize}
                    disabled={!chunkSizeAvailable}
                    onChange={(event) => updateDraft({ chunkSize: event.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 pr-14 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-focus)] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-[var(--text-muted)]">
                    MiB
                  </span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {chunkSizeAvailable
                    ? chunkSizeHint
                    : 'Chunk size settings are unavailable on this server.'}
                </span>
              </label>
            </div>

            {(savePending || saveError) && (
              <div
                className={`mt-5 rounded-xl px-4 py-3 text-sm ${
                  saveError
                    ? 'border border-[var(--danger)]/30 bg-[var(--danger-dim)] text-[var(--danger)]'
                    : 'border border-[var(--border)] bg-[var(--bg-surface)]/70 text-[var(--text-secondary)]'
                }`}
              >
                {saveError || 'Saving…'}
              </div>
            )}
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
