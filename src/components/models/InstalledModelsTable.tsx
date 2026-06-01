import { Link } from 'react-router-dom';
import { SkeletonRow } from '../SkeletonBlock';
import { useModels } from '../../context/ModelsContext';
import { modelCacheStatusLabel, type ModelCacheStatus } from '../../lib/modelCache';
import { useModels } from '../../context/ModelsContext';
import { modelCacheStatusLabel, type ModelCacheStatus } from '../../lib/modelCache';
import { buildChatPath } from '../../lib/routes';

type InstalledModelsTableProps = {
  getModelStatus: (modelRef: string) => ModelCacheStatus;
  onPrefetch: (modelRef: string) => void;
};

export function InstalledModelsTable({
  getModelStatus,
  onPrefetch,
}: InstalledModelsTableProps) {
  const { models, loading } = useModels();

  return (
    <div>
      <div className="px-4 pt-6 pb-2 border-t border-(--border) text-[0.7rem] font-semibold tracking-widest uppercase text-(--text-muted)">
        Installed models
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {[
                'Name',
                'Parameters',
                'Architecture',
                'Quantization',
                'Thinking',
                'Source',
                'Status',
                'Actions',
              ].map((h, i) => (
                <th
                  key={h}
                  className="font-[var(--font-mono)] text-[0.72rem] uppercase tracking-[0.08em] text-[var(--text-muted)] px-4 py-3 border-b border-[var(--border)] text-left whitespace-nowrap"
                  style={i === 4 ? { width: '1%', whiteSpace: 'nowrap' } : undefined}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRow key={i} cols={8} />
              ))
            ) : models.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-[var(--text-primary)] align-middle">
                  <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
                    <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--accent-dim)] grid place-items-center text-[var(--accent)]">
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
                    <h3 className="font-[var(--font-heading)] text-base font-semibold text-[var(--text-primary)]">
                      No models installed
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] max-w-[320px]">
                      Search Hugging Face above or upload a local .gguf file.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              models.map((model) => {
                const status = getModelStatus(model.model);

                return (
                  <tr key={model.model} className="hover:[&>td]:bg-[var(--bg-elevated)]">
                    <td className="px-4 py-4 border-b border-[var(--border-subtle)] align-middle text-[var(--text-primary)] transition-colors">
                      <div className="font-medium">{model.display_name}</div>
                      <div className="text-xs text-[var(--text-muted)] font-[var(--font-mono)] mt-0.5">{model.model}</div>
                    </td>
                    <td className="px-4 py-4 border-b border-[var(--border-subtle)] align-middle font-[var(--font-mono)] text-[0.8125rem] text-[var(--text-primary)] transition-colors">
                      {model.parameters || '—'}
                    </td>
                    <td className="px-4 py-4 border-b border-[var(--border-subtle)] align-middle font-[var(--font-mono)] text-[0.8125rem] text-[var(--text-primary)] transition-colors">
                      {model.architecture || '—'}
                    </td>
                    <td className="px-4 py-4 border-b border-[var(--border-subtle)] align-middle font-[var(--font-mono)] text-[0.8125rem] text-[var(--text-primary)] transition-colors">
                      {model.quantization || '—'}
                    </td>
                    <td className="px-4 py-4 border-b border-[var(--border-subtle)] align-middle text-center transition-colors">
                      {model.supports_thinking && (
                        <span className="inline-flex items-center text-[0.7rem] font-semibold tracking-wide px-1.5 py-0.5 rounded-full border text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[color-mix(in_srgb,var(--accent)_30%,transparent)]">
                          Think
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 border-b border-[var(--border-subtle)] align-middle text-[0.8125rem] text-[var(--text-secondary)] transition-colors">
                      {model.source}
                    </td>
                    <td className="px-4 py-4 border-b border-[var(--border-subtle)] align-middle text-[0.8125rem] text-[var(--text-secondary)] transition-colors">
                      <div className="inline-flex items-center gap-2">
                        <span>{modelCacheStatusLabel(status)}</span>
                        {status === 'not_cached' && (
                          <button
                            type="button"
                            onClick={() => onPrefetch(model.model)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] cursor-pointer outline-none"
                            title="Download model"
                            aria-label={`Download ${model.display_name}`}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 3v12" />
                              <path d="m7 10 5 5 5-5" />
                              <path d="M5 21h14" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 border-b border-[var(--border-subtle)] align-middle transition-colors">
                      <div className="flex gap-1.5 items-center">
                        <Link
                          to={buildChatPath(model.model)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none"
                        >
                          Chat
                        </Link>
                        <a
                          href={model.link_href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer outline-none"
                        >
                          {model.link_label}
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
