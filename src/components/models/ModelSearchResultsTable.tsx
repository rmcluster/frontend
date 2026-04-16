import type { SearchResult } from '../../types/ui';

type ModelSearchResultsTableProps = {
  results: SearchResult[];
  onAdd: (model: string) => void;
};

export function ModelSearchResultsTable({ results, onAdd }: ModelSearchResultsTableProps) {
  if (results.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)', letterSpacing: '-0.01em' }}>
        Search results
      </h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Downloads</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item) => (
              <tr key={item.model}>
                <td>
                  <div className="td-name">{item.display_name}</div>
                  <div className="td-sub">{item.model}</div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                  {item.downloads.toLocaleString()}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => onAdd(item.model)}>
                      Add
                    </button>
                    <a
                      href={item.link_href}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
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
