import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { DavEntry } from '../../types/files';
import { extOf, classify } from '../../types/files';
import { DAV_BASE } from '../../lib/routes';
import { ConfirmModal } from './ConfirmModal';
import { CsvViewer } from './CsvViewer';
import { StateDisplay } from '../StateDisplay';

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
      <pre className="overflow-auto text-(--text-primary) text-sm font-mono p-4 leading-relaxed whitespace-pre-wrap wrap-break-word">
        {pretty}
      </pre>
    </div>
  );
}

// ── FileViewer ────────────────────────────────────────────────────────────────

export type FileViewerHandle = {
  save: () => Promise<void>;
  tryClose: () => void;
};

type FileViewerProps = {
  entry: DavEntry;
  onClose: () => void;
  preview: boolean;
};

export const FileViewer = forwardRef<FileViewerHandle, FileViewerProps>(
  function FileViewer({ entry, onClose, preview }, ref) {
    const [textContent, setTextContent] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [showLeaveWarning, setShowLeaveWarning] = useState(false);
    const [loadingText, setLoadingText] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const ext = extOf(entry.name);
    const kind = classify(entry.name, entry.contentType);

    useImperativeHandle(ref, () => ({
      save: handleSave,
      tryClose: () => {
        if (isDirty) setShowLeaveWarning(true);
        else onClose();
      },
    }));

    // Warn before browser refresh/close when there are unsaved edits
    useEffect(() => {
      if (!isDirty) return;
      const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    // Cmd/Ctrl+S saves the file
    useEffect(() => {
      if (kind !== 'text' || preview) return;
      const handler = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
          e.preventDefault();
          handleSave();
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    // handleSave is stable within a render; preview/kind guard re-registers on mode change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kind, preview]);

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
      } finally {
        setSaving(false);
      }
    }

    return (
      <div className="flex flex-col">
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
              onClick: async () => { await handleSave(); onClose(); },
            },
          ]}
        />

        {kind === 'image' && (
          <div className="flex items-center justify-center p-8 min-h-80">
            <img
              src={`${DAV_BASE}${entry.path}`}
              alt={entry.name}
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          </div>
        )}
        {kind === 'video' && (
          <div className="flex items-center justify-center p-6">
            <video
              src={`${DAV_BASE}${entry.path}`}
              controls
              className="max-w-full max-h-[70vh] rounded"
            />
          </div>
        )}
        {kind === 'text' && (
          loadingText || fetchError ? (
            <StateDisplay loading={loadingText} error={fetchError ? `Failed to load: ${fetchError}` : null} />
          ) : preview && ext === 'csv' ? (
            <div className="p-4 overflow-x-auto">
              <CsvViewer raw={textContent} />
            </div>
          ) : preview && ext === 'json' ? (
            <div className="p-6">
              <JsonPreview raw={textContent} />
            </div>
          ) : preview && ext === 'md' ? (
            <div className="px-8 py-6 max-w-3xl">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-3 text-(--text-primary) border-b border-(--border) pb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-2 text-(--text-primary)">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-(--text-primary)">{children}</h3>,
                  p: ({ children }) => <p className="mb-3 text-sm leading-relaxed text-(--text-primary)">{children}</p>,
                  a: ({ href, children }) => <a href={href} className="text-(--accent) hover:underline">{children}</a>,
                  ul: ({ children }) => <ul className="mb-3 ml-5 list-disc text-sm text-(--text-primary)">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal text-sm text-(--text-primary)">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  code: ({ children, className }) =>
                    className ? (
                      <code className="block overflow-auto rounded bg-(--bg-elevated) text-(--text-primary) text-xs font-mono p-3 mb-3">{children}</code>
                    ) : (
                      <code className="text-xs font-mono bg-(--bg-elevated) text-(--accent) px-1 py-0.5 rounded">{children}</code>
                    ),
                  pre: ({ children }) => <pre className="mb-3">{children}</pre>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-(--border) pl-4 text-(--text-muted) italic mb-3">{children}</blockquote>,
                  hr: () => <hr className="my-4 border-(--border)" />,
                  strong: ({ children }) => <strong className="font-semibold text-(--text-primary)">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                }}
              >
                {textContent}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col">
              <textarea
                className="w-full min-h-[60vh] p-6 text-sm font-mono bg-white dark:bg-(--bg-surface) text-(--text-primary) outline-none resize-y leading-relaxed placeholder:text-(--text-muted)"
                value={textContent}
                placeholder="Empty file — start typing to add content"
                onChange={(e) => { setTextContent(e.target.value); setIsDirty(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const el = e.currentTarget;
                    const start = el.selectionStart;
                    const end = el.selectionEnd;
                    const next = textContent.slice(0, start) + '\t' + textContent.slice(end);
                    setTextContent(next);
                    setIsDirty(true);
                    requestAnimationFrame(() => {
                      el.selectionStart = el.selectionEnd = start + 1;
                    });
                  }
                }}
                spellCheck={false}
              />
              <div className="flex items-center justify-between px-4 py-1.5 border-t border-(--border) bg-(--bg-elevated) text-xs text-(--text-muted) font-mono select-none">
                <span>{isDirty ? 'Unsaved changes' : 'No changes'}</span>
                <span>
                  {textContent.split('\n').length} lines · {textContent.length} chars
                </span>
              </div>
            </div>
          )
        )}
      </div>
    );
  }
);
