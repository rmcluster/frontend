import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { FileX } from 'lucide-react';
import type { DavEntry } from '../../types/files';
import { extOf, classify } from '../../types/files';
import { DAV_BASE } from '../../lib/routes';
import { ConfirmModal } from './ConfirmModal';
import { StateDisplay } from '../StateDisplay';
import { CsvViewer } from './viewers/CsvViewer';
import { JsonViewer } from './viewers/JsonViewer';
import { XmlViewer } from './viewers/XmlViewer';
import { MarkdownViewer } from './viewers/MarkdownViewer';

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
    const [saveError, setSaveError] = useState<string | null>(null);

    const ext = extOf(entry.name);
    const kind = classify(entry.name, entry.contentType);
    const src = `${DAV_BASE}${entry.path}`;

    useImperativeHandle(ref, () => ({
      save: handleSave,
      tryClose: () => {
        if (isDirty) setShowLeaveWarning(true);
        else onClose();
      },
    }));

    useEffect(() => {
      if (!isDirty) return;
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
      };
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kind, preview]);

    useEffect(() => {
      if (kind !== 'text') return;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingText(true);
      setFetchError(null);
      setTextContent('');
      setIsDirty(false);
      fetch(src)
        .then((r) => {
          if (!r.ok) throw new Error(`${r.status}`);
          return r.text();
        })
        .then(setTextContent)
        .catch((e: unknown) =>
          setFetchError(e instanceof Error ? e.message : String(e))
        )
        .finally(() => setLoadingText(false));
    }, [src, kind]);

    async function handleSave() {
      setSaving(true);
      try {
        const blob = new Blob([textContent], { type: 'text/plain' });
        const res = await fetch(src, { method: 'PUT', body: blob });
        if (!res.ok) throw new Error(`Server returned ${res.status} ${res.statusText}`);
        setIsDirty(false);
      } catch (e: unknown) {
        setSaveError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setSaving(false);
      }
    }

    const isStructuredPreview =
      ext === 'csv' ||
      ext === 'json' ||
      ext === 'md' ||
      ext === 'html' ||
      ext === 'htm' ||
      ext === 'xml';

    return (
      <div className="flex flex-col">
        <ConfirmModal
          open={saveError !== null}
          title="Save failed"
          message={saveError ?? ''}
          onClose={() => setSaveError(null)}
          actions={[{ label: 'Dismiss', variant: 'danger', onClick: () => setSaveError(null) }]}
        />

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

        {kind === 'unknown' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-(--text-muted)">
            <FileX size={40} className="opacity-40" />
            <p className="text-sm">No preview available for this file type.</p>
            <a
              href={src}
              download={entry.name}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--accent) text-white hover:opacity-90 transition-opacity"
            >
              Download {entry.name}
            </a>
          </div>
        )}

        {kind === 'audio' && (
          <div className="flex items-center justify-center p-12">
            <audio controls src={src} className="w-full max-w-xl" />
          </div>
        )}

        {kind === 'pdf' && (
          <iframe
            src={src}
            className="w-full min-h-[80vh] border-0"
            title={entry.name}
          />
        )}

        {kind === 'image' && (
          <div className="flex items-center justify-center p-8 min-h-80">
            <img
              src={src}
              alt={entry.name}
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          </div>
        )}

        {kind === 'video' && (
          <div className="flex items-center justify-center p-6">
            <video
              src={src}
              controls
              className="max-w-full max-h-[70vh] rounded"
            />
          </div>
        )}

        {kind === 'text' &&
          (loadingText || fetchError ? (
            <StateDisplay
              loading={loadingText}
              error={fetchError ? `Failed to load: ${fetchError}` : null}
            />
          ) : preview && isStructuredPreview ? (
            ext === 'csv' ? (
              <div className="p-4 overflow-x-auto">
                <CsvViewer raw={textContent} />
              </div>
            ) : ext === 'json' ? (
              <JsonViewer raw={textContent} />
            ) : ext === 'xml' ? (
              <XmlViewer raw={textContent} />
            ) : ext === 'html' || ext === 'htm' ? (
              <iframe
                srcDoc={textContent}
                sandbox="allow-scripts allow-same-origin"
                className="w-full min-h-[60vh] border-0"
                title="HTML preview"
              />
            ) : (
              <MarkdownViewer raw={textContent} />
            )
          ) : (
            <div className="flex flex-col">
              <textarea
                className="w-full min-h-[60vh] p-6 text-sm font-mono bg-white dark:bg-(--bg-surface) text-(--text-primary) outline-none resize-y leading-relaxed placeholder:text-(--text-muted)"
                value={textContent}
                placeholder="Empty file — start typing to add content"
                onChange={(e) => {
                  setTextContent(e.target.value);
                  setIsDirty(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const el = e.currentTarget;
                    const start = el.selectionStart;
                    const end = el.selectionEnd;
                    const next =
                      textContent.slice(0, start) +
                      '\t' +
                      textContent.slice(end);
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
                  {textContent.split('\n').length} lines · {textContent.length}{' '}
                  chars
                </span>
              </div>
            </div>
          ))}
      </div>
    );
  }
);
