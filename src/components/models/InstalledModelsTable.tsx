import { Link } from 'react-router-dom';
import { SkeletonRow } from '../SkeletonBlock';
import type { Model } from '../../types/ui';
import { buildChatPath } from '../../lib/routes';

type InstalledModelsTableProps = {
  models: Model[];
  loading: boolean;
};

export function InstalledModelsTable({
  models,
  loading,
}: InstalledModelsTableProps) {
  return (
    <div className="card">
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1rem',
          fontWeight: 600,
          marginBottom: 'var(--space-4)',
          letterSpacing: '-0.01em',
        }}
      >
        Installed models
      </h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Parameters</th>
              <th>Architecture</th>
              <th>Quantization</th>
              <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Thinking</th>
              <th>Source</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRow key={i} cols={6} />
              ))
            ) : models.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div
                    className="empty-state"
                    style={{ padding: 'var(--space-10) 0' }}
                  >
                    <div className="empty-state-icon">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      </svg>
                    </div>
                    <h3>No models installed</h3>
                    <p>
                      Search Hugging Face above or upload a local .gguf file.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              models.map((model) => (
                <tr key={model.model}>
                  <td>
                    <div className="td-name">{model.display_name}</div>
                    <div className="td-sub">{model.model}</div>
                  </td>
                  <td
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {model.parameters || '—'}
                  </td>
                  <td
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {model.architecture || '—'}
                  </td>
                  <td
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {model.quantization || '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {model.supports_thinking && (
                      <span className="badge badge-thinking">Think</span>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {model.source}
                    </span>
                  </td>
                  <td>
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center',
                      }}
                    >
                      <Link
                        to={buildChatPath(model.model)}
                        className="btn btn-primary btn-sm"
                      >
                        Chat
                      </Link>
                      <a
                        href={model.link_href}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        {model.link_label}
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
