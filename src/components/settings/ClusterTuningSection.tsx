import { Workflow } from 'lucide-react';
import {
  MAX_CHUNK_SIZE_MIB,
  MIN_CHUNK_SIZE_MIB,
  SettingsDraft,
} from './useSettingsState';

type ParallelismFieldProps = {
  nodeCount: number;
  value: string;
  onChange: (nextValue: string) => void;
};

function ParallelismField({ nodeCount, value, onChange }: ParallelismFieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--text-primary)]">Parallelism target</span>
      <input
        type="number"
        min={1}
        max={nodeCount}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-focus)]"
      />
      <span className="text-xs text-[var(--text-muted)]">
        {nodeCount} connected node{nodeCount === 1 ? '' : 's'}
      </span>
    </label>
  );
}

type ChunkSizeFieldProps = {
  available: boolean;
  value: string;
  hint: string;
  onChange: (nextValue: string) => void;
};

function ChunkSizeField({ available, value, hint, onChange }: ChunkSizeFieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--text-primary)]">Chunk size</span>
      <div className="relative">
        <input
          type="number"
          min={MIN_CHUNK_SIZE_MIB}
          max={MAX_CHUNK_SIZE_MIB}
          step={1}
          inputMode="numeric"
          value={value}
          disabled={!available}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 pr-14 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-focus)] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-[var(--text-muted)]">
          MiB
        </span>
      </div>
      <span className="text-xs text-[var(--text-muted)]">
        {available ? hint : 'Chunk size settings are unavailable on this server.'}
      </span>
    </label>
  );
}

type SaveStatusProps = {
  pending: boolean;
  error: string;
};

function SaveStatus({ pending, error }: SaveStatusProps) {
  if (!pending && !error) {
    return null;
  }

  return (
    <div
      className={`mt-5 rounded-xl px-4 py-3 text-sm ${
        error
          ? 'border border-[var(--danger)]/30 bg-[var(--danger-dim)] text-[var(--danger)]'
          : 'border border-[var(--border)] bg-[var(--bg-surface)]/70 text-[var(--text-secondary)]'
      }`}
    >
      {error || 'Saving…'}
    </div>
  );
}

type ClusterTuningSectionProps = {
  nodeCount: number;
  chunkSizeAvailable: boolean;
  draft: SettingsDraft;
  chunkSizeHint: string;
  savePending: boolean;
  saveError: string;
  onChange: (patch: Partial<SettingsDraft>) => void;
};

export function ClusterTuningSection({
  nodeCount,
  chunkSizeAvailable,
  draft,
  chunkSizeHint,
  savePending,
  saveError,
  onChange,
}: ClusterTuningSectionProps) {
  return (
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
            Changes auto-saved.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        <ParallelismField
          nodeCount={nodeCount}
          value={draft.parallelism}
          onChange={(parallelism) => onChange({ parallelism })}
        />
        <ChunkSizeField
          available={chunkSizeAvailable}
          value={draft.chunkSize}
          hint={chunkSizeHint}
          onChange={(chunkSize) => onChange({ chunkSize })}
        />
      </div>

      <SaveStatus pending={savePending} error={saveError} />
    </section>
  );
}
