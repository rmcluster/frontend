import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { DavEntry } from '../../types/files';
import { extOf, classify } from '../../types/files';
import { downloadUrl, moveEntry } from '../../lib/webdav';
import { DAV_BASE } from '../../lib/routes';
import { ConfirmModal } from './ConfirmModal';
import { CsvViewer } from './CsvViewer';
import { ChevronLeft, Check, X, Pencil } from 'lucide-react';

// ── JSON viewer ───────────────────────────────────────────────────────────────

function JsonPreview({ raw }: { raw: string }) {
  let pretty: string;
  let error: string | null = null;
  try {
    pretty = JSON.stringify(JSON.parse(raw), null, 2);
  } catch (e) {
    pretty = raw;
    error = e instanceof Error ? e.message : 'Invalid JSON';
  }
  return (
    <div>
      {error && (
        <div className="mb-2 px-3 py-1.5 rounded-md bg-[var(--danger,#ef4444)]/10 text-[var(--danger,#ef4444)] text-xs font-mono">
          {error}
        </div>
      )}
      <pre className="overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm font-mono p-4 leading-relaxed whitespace-pre-wrap break-words">
        {pretty}
      </pre>
    </div>
  );
}

// ── FileViewer ────────────────────────────────────────────────────────────────

type FileViewerProps = {
  entry: DavEntry;
  onClose: () => void;
  onRename: (updated: DavEntry) => void;
  fileMode?: 'preview' | 'edit' | null;
  onFileModeChange?: (mode: 'preview' | 'edit') => void;
  renameSignal?: number;
};

export function FileViewer({
  entry,
  onClose,
  onRename,
  fileMode,
  onFileModeChange,
  renameSignal,
}: FileViewerProps) {
  const [textContent, setTextContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [loadingText, setLoadingText] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // preview vs edit toggle for structured types
  const ext = extOf(entry.name);
  const isStructured = ext === 'csv' || ext === 'json' || ext === 'md';
  const defaultPreview = isStructured;
  const [preview, setPreview] = useState(
    fileMode != null ? fileMode === 'preview' : defaultPreview
  );

  // Sync preview when URL-driven fileMode changes (e.g. after reload)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fileMode != null) setPreview(fileMode === 'preview');
  }, [fileMode]);

  // Inline rename state
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [renameValue, setRenameValue] = useState(entry.name);
  const [renaming, setRenaming] = useState(false);
  // null = no warning; string = new name that triggered warning
  const [extWarnNewName, setExtWarnNewName] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const kind = classify(entry.name, entry.contentType);
  const url = downloadUrl(entry.path);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRenameValue(entry.name);
  }, [entry.name]);

  useEffect(() => {
    if (renameSignal) startRenameTitle();
    // startRenameTitle is stable (no deps); only fire on signal change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renameSignal]);

  // Warn before browser refresh/close when there are unsaved edits
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    if (kind !== 'text') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingText(true);
    setFetchError(null);
    setTextContent('');
    setIsDirty(false);
    fetch(`${DAV_BASE}${entry.path}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.text();
      })
      .then(setTextContent)
      .catch((e: unknown) =>
        setFetchError(e instanceof Error ? e.message : String(e))
      )
      .finally(() => setLoadingText(false));
  }, [entry.path, kind]);

  function togglePreview(p: boolean) {
    setPreview(p);
    onFileModeChange?.(p ? 'preview' : 'edit');
  }

  function startRenameTitle() {
    setRenameValue(entry.name);
    setRenamingTitle(true);
    setExtWarnNewName(null);
    setTimeout(() => titleInputRef.current?.select(), 0);
  }

  function cancelRenameTitle() {
    setRenamingTitle(false);
    setRenameValue(entry.name);
    setExtWarnNewName(null);
  }

  async function doRenameTitle(name: string) {
    setRenaming(true);
    const parentPath = entry.path.replace(/\/?[^/]+\/?$/, '/');
    const toPath = `${parentPath}${name}`;
    await moveEntry(entry.path, toPath);
    setRenaming(false);
    setRenamingTitle(false);
    setExtWarnNewName(null);
    onRename({ ...entry, name, path: toPath });
  }

  async function commitRenameTitle() {
    if (renaming || extWarnNewName) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === entry.name) {
      cancelRenameTitle();
      return;
    }

    const oldExt = extOf(entry.name);
    const newExt = extOf(trimmed);
    // Only warn when changing from one real extension to a different one
    if (oldExt && newExt && oldExt !== newExt) {
      setExtWarnNewName(trimmed);
      return;
    }

    await doRenameTitle(trimmed);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const blob = new Blob([textContent], { type: 'text/plain' });
      const res = await fetch(`${DAV_BASE}${entry.path}`, {
        method: 'PUT',
        body: blob,
      });
      if (!res.ok) throw new Error(`PUT ${res.status}`);
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-col border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            onClick={() => (isDirty ? setShowLeaveWarning(true) : onClose())}
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer outline-none shrink-0 mr-1"
          >
            <ChevronLeft size={16} />
            Back
          </button>

          {/* Inline filename / rename */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {renamingTitle ? (
              <>
                <input
                  ref={titleInputRef}
                  autoFocus
                  className="flex-1 min-w-0 text-sm px-2 py-0.5 bg-[var(--bg-input)] border border-[var(--accent)] rounded outline-none text-[var(--text-primary)]"
                  value={renameValue}
                  onChange={(e) => {
                    setRenameValue(e.target.value);
                    setExtWarnNewName(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitRenameTitle();
                    }
                    if (e.key === 'Escape') cancelRenameTitle();
                  }}
                />
                <button
                  onClick={commitRenameTitle}
                  disabled={renaming}
                  className="shrink-0 p-1 rounded text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer outline-none disabled:opacity-50"
                  aria-label="Save rename"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={cancelRenameTitle}
                  className="shrink-0 p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer outline-none"
                  aria-label="Cancel rename"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <button
                onClick={startRenameTitle}
                title="Click to rename"
                className="flex items-center gap-1.5 min-w-0 group cursor-pointer outline-none"
              >
                <span className="text-sm text-[var(--text-primary)] font-medium truncate">
                  {entry.name}
                </span>
                <Pencil size={13}
                  className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity text-[var(--text-secondary)]"
                />
              </button>
            )}
          </div>

          {/* Preview/Edit toggle for structured types */}
          {kind === 'text' && isStructured && !loadingText && !fetchError && (
            <div className="shrink-0 flex items-center rounded-md border border-[var(--border)] overflow-hidden text-xs">
              <button
                onClick={() => togglePreview(true)}
                className={`px-2.5 py-1 cursor-pointer outline-none transition-colors ${preview ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                Preview
              </button>
              <button
                onClick={() => togglePreview(false)}
                className={`px-2.5 py-1 cursor-pointer outline-none transition-colors ${!preview ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                Edit
              </button>
            </div>
          )}

          {kind === 'text' && !preview && (
            <button
              onClick={handleSave}
              disabled={saving || loadingText}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
            </button>
          )}
          <a
            href={url}
            download={entry.name}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
          >
            Download
          </a>
        </div>
      </div>

      <ConfirmModal
        open={showLeaveWarning}
        title="Unsaved changes"
        message="You have unsaved changes. What would you like to do?"
        onClose={() => setShowLeaveWarning(false)}
        actions={[
          { label: 'Leave anyway', variant: 'danger', onClick: onClose },
          {
            label: saving ? 'Saving…' : 'Save & leave',
            variant: 'primary',
            disabled: saving,
            onClick: async () => {
              await handleSave();
              onClose();
            },
          },
        ]}
      />

      <ConfirmModal
        open={extWarnNewName !== null}
        title="Change file type"
        message={
          extWarnNewName
            ? `Change extension from .${extOf(entry.name)} to .${extOf(extWarnNewName)}?`
            : ''
        }
        onClose={() => setExtWarnNewName(null)}
        actions={[
          {
            label: 'Change extension',
            variant: 'primary',
            onClick: () => {
              if (extWarnNewName) doRenameTitle(extWarnNewName);
            },
          },
        ]}
      />

      {/* Content */}
      <div className="p-4">
        {kind === 'image' && (
          <div className="flex items-center justify-center min-h-[320px]">
            <img
              src={url}
              alt={entry.name}
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          </div>
        )}
        {kind === 'video' && (
          <div className="flex items-center justify-center">
            <video
              src={url}
              controls
              className="max-w-full max-h-[70vh] rounded"
            />
          </div>
        )}
        {kind === 'text' &&
          (loadingText ? (
            <div className="h-64 rounded-lg bg-[var(--bg-elevated)] animate-pulse" />
          ) : fetchError ? (
            <div className="flex items-center justify-center py-12 text-sm text-[var(--text-muted)]">
              Failed to load: {fetchError}
            </div>
          ) : preview && ext === 'csv' ? (
            <CsvViewer raw={textContent} />
          ) : preview && ext === 'json' ? (
            <JsonPreview raw={textContent} />
          ) : preview && ext === 'md' ? (
            <div className="max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mt-6 mb-3 text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold mt-5 mb-2 text-[var(--text-primary)]">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold mt-4 mb-2 text-[var(--text-primary)]">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-3 text-sm leading-relaxed text-[var(--text-primary)]">
                      {children}
                    </p>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-[var(--accent)] hover:underline"
                    >
                      {children}
                    </a>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-3 ml-5 list-disc text-sm text-[var(--text-primary)]">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-3 ml-5 list-decimal text-sm text-[var(--text-primary)]">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  code: ({ children, className }) =>
                    className ? (
                      <code className="block overflow-auto rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs font-mono p-3 mb-3">
                        {children}
                      </code>
                    ) : (
                      <code className="text-xs font-mono bg-[var(--bg-elevated)] text-[var(--accent)] px-1 py-0.5 rounded">
                        {children}
                      </code>
                    ),
                  pre: ({ children }) => <pre className="mb-3">{children}</pre>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-[var(--border)] pl-4 text-[var(--text-muted)] italic mb-3">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="my-4 border-[var(--border)]" />,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-[var(--text-primary)]">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                }}
              >
                {textContent}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              className="w-full min-h-[60vh] p-4 text-sm font-mono bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--accent)] resize-y leading-relaxed"
              value={textContent}
              onChange={(e) => {
                setTextContent(e.target.value);
                setIsDirty(true);
              }}
              spellCheck={false}
            />
          ))}
      </div>
    </div>
  );
}
