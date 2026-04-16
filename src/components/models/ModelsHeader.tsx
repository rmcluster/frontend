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
    <section className="card hero">
      <div className="eyebrow">Models</div>
      <h2>Search and manage GGUF models</h2>
      <p>
        Use a single search field for Hugging Face repos. Add local models
        through the modal, and the table only shows real data when available.
      </p>
      <form className="search-row" onSubmit={onSearch}>
        <input
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onQueryChange(e.target.value)
          }
          placeholder="Search HF repos or paste owner/repo"
        />
        <button type="submit">{searching ? 'Searching...' : 'Search'}</button>
        <button
          type="button"
          className="secondary"
          onClick={onOpenLocalModelDialog}
        >
          Add local model
        </button>
      </form>
      {error && <div className="notice">{error}</div>}
    </section>
  );
}
