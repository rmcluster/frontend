import type { ChangeEvent, FormEvent } from 'react';

type ModelsHeaderProps = {
  query: string;
  searching: boolean;
  error: string | null;
  onQueryChange: (value: string) => void;
  onSearch: (event: FormEvent) => void;
  onOpenLocalModelDialog: () => void;
};

export function ModelsHeader({
  query,
  searching,
  error,
  onQueryChange,
  onSearch,
  onOpenLocalModelDialog,
}: ModelsHeaderProps) {
  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 mb-4">
      <div className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-2">
        Models
      </div>
      <h2 className="font-[var(--font-heading)] text-xl font-bold text-[var(--text-primary)] mb-2">
        Search and manage GGUF models
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        Use a single search field for Hugging Face repos. Add local models
        through the modal, and the table only shows real data when available.
      </p>
      <form className="flex gap-3 items-stretch flex-wrap" onSubmit={onSearch}>
        <input
          className="flex-1 min-w-[200px] w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onQueryChange(e.target.value)}
          placeholder="Search HF repos or paste owner/repo"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer outline-none"
          onClick={onOpenLocalModelDialog}
        >
          Add local model
        </button>
      </form>
      {error && (
        <div className="mt-3 text-sm text-[var(--danger)]">{error}</div>
      )}
    </section>
  );
}
