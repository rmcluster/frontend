import type { SearchResult } from '../../types/ui';

type ModelSearchResultsTableProps = {
  results: SearchResult[];
  onAdd: (model: string) => void;
};

export function ModelSearchResultsTable({ results, onAdd }: ModelSearchResultsTableProps) {
  if (results.length === 0) return null;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 mb-4">
      <h2 className="font-[var(--font-heading)] text-base font-semibold text-[var(--text-primary)] mb-4 tracking-[-0.01em]">
        Search results
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {['Model', 'Downloads', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="font-[var(--font-mono)] text-[0.72rem] uppercase tracking-[0.08em] text-[var(--text-muted)] px-4 py-3 border-b border-[var(--border)] text-left whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((item) => (
              <tr key={item.model} className="hover:[&>td]:bg-[var(--bg-elevated)]">
                <td className="px-4 py-4 border-b border-[var(--border-subtle)] align-middle text-[var(--text-primary)] transition-colors">
                  <div className="font-medium">{item.display_name}</div>
                  <div className="text-xs text-[var(--text-muted)] font-[var(--font-mono)] mt-0.5">{item.model}</div>
                </td>
                <td className="px-4 py-4 border-b border-[var(--border-subtle)] align-middle font-[var(--font-mono)] text-[0.8125rem] text-[var(--text-primary)] transition-colors">
                  {item.downloads.toLocaleString()}
                </td>
                <td className="px-4 py-4 border-b border-[var(--border-subtle)] align-middle transition-colors">
                  <div className="flex gap-1.5">
                    <button
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none"
                      onClick={() => onAdd(item.model)}
                    >
                      Add
                    </button>
                    <a
                      href={item.link_href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer outline-none"
                    >
                      Repo
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
