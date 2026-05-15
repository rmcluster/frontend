import { useEffect, useState } from 'react';
import type { DavEntry } from '../../lib/webdav';
import { downloadUrl, uploadFile } from '../../lib/webdav';
import { DAV_BASE } from '../../lib/routes';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v']);
const TEXT_EXTS = new Set([
  'txt', 'md', 'json', 'csv', 'js', 'ts', 'tsx', 'jsx',
  'py', 'go', 'rs', 'yaml', 'yml', 'toml', 'xml', 'html',
  'css', 'sh', 'bash', 'env', 'gitignore', 'log',
]);

function extOf(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

type FileType = 'image' | 'video' | 'text' | 'unknown';

function classify(entry: DavEntry): FileType {
  const ext = extOf(entry.name);
  const mime = entry.contentType?.split(';')[0].trim() ?? '';
  if (mime.startsWith('image/') || IMAGE_EXTS.has(ext)) return 'image';
  if (mime.startsWith('video/') || VIDEO_EXTS.has(ext)) return 'video';
  if (mime.startsWith('text/') || TEXT_EXTS.has(ext)) return 'text';
  return 'unknown';
}

type FileViewerProps = {
  entry: DavEntry | null;
  onClose: () => void;
};

export function FileViewer({ entry, onClose }: FileViewerProps) {
  const [textContent, setTextContent] = useState('');
  const [loadingText, setLoadingText] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    if (classify(entry) !== 'text') return;
    setLoadingText(true);
    setFetchError(null);
    fetch(`${DAV_BASE}${entry.path}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.text();
      })
      .then((t) => setTextContent(t))
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoadingText(false));
  }, [entry]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!entry) return null;
  const kind = classify(entry);
  const url = downloadUrl(entry.path);

  async function handleSave() {
    if (!entry) return;
    setSaving(true);
    try {
      const blob = new Blob([textContent], { type: 'text/plain' });
      const file = new File([blob], entry.name);
      // Use PUT directly since uploadFile builds the path from dir + filename
      const res = await fetch(`${DAV_BASE}${entry.path}`, {
        method: 'PUT',
        body: file,
      });
      if (!res.ok) throw new Error(`PUT ${res.status}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border)] flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium text-[var(--text-primary)] truncate">{entry.name}</span>
        <div className="flex items-center gap-2 ml-4">
          {kind === 'text' && (
            <button
              onClick={handleSave}
              disabled={saving || loadingText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none disabled:opacity-50"
            >
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
            </button>
          )}
          <a
            href={url}
            download={entry.name}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Download
          </a>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer outline-none"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {kind === 'image' && (
          <img
            src={url}
            alt={entry.name}
            className="max-w-full max-h-full object-contain rounded shadow-lg"
          />
        )}

        {kind === 'video' && (
          <video
            src={url}
            controls
            autoPlay={false}
            className="max-w-full max-h-full rounded shadow-lg"
          />
        )}

        {kind === 'text' && (
          <div className="w-full h-full flex flex-col max-w-4xl mx-auto">
            {loadingText ? (
              <div className="flex-1 bg-[var(--bg-surface)] rounded-lg animate-pulse" />
            ) : fetchError ? (
              <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">
                Failed to load file: {fetchError}
              </div>
            ) : (
              <textarea
                className="flex-1 w-full h-full min-h-[60vh] p-4 text-sm font-mono bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--accent)] resize-none leading-relaxed"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                spellCheck={false}
              />
            )}
          </div>
        )}

        {kind === 'unknown' && (
          <div className="flex flex-col items-center gap-4 text-[var(--text-muted)]">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <p className="text-sm">No preview available</p>
            <a
              href={url}
              download={entry.name}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
            >
              Download file
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
