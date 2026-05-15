import { useEffect, useState } from 'react';
import type { DavEntry } from '../../lib/webdav';
import { downloadUrl } from '../../lib/webdav';
import { DAV_BASE } from '../../lib/routes';

const IMAGE_EXTS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'avif',
  'bmp',
]);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v']);
const TEXT_EXTS = new Set([
  'txt',
  'md',
  'json',
  'csv',
  'js',
  'ts',
  'tsx',
  'jsx',
  'py',
  'go',
  'rs',
  'yaml',
  'yml',
  'toml',
  'xml',
  'html',
  'css',
  'sh',
  'bash',
  'env',
  'gitignore',
  'log',
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
  entry: DavEntry;
  onClose: () => void;
};

export function FileViewer({ entry, onClose }: FileViewerProps) {
  const [textContent, setTextContent] = useState('');
  const [loadingText, setLoadingText] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const kind = classify(entry);
  const url = downloadUrl(entry.path);

  useEffect(() => {
    if (kind !== 'text') return;
    setLoadingText(true);
    setFetchError(null);
    setTextContent('');
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
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar inside the card */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer outline-none mr-1"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>
        <span className="text-sm text-[var(--text-primary)] font-medium truncate flex-1">
          {entry.name}
        </span>
        {kind === 'text' && (
          <button
            onClick={handleSave}
            disabled={saving || loadingText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </button>
        )}
        <a
          href={url}
          download={entry.name}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
        >
          Download
        </a>
      </div>

      {/* Content area */}
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
          ) : (
            <textarea
              className="w-full min-h-[60vh] p-4 text-sm font-mono bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--accent)] resize-y leading-relaxed"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              spellCheck={false}
            />
          ))}

        {kind === 'unknown' && (
          <div className="flex flex-col items-center gap-4 py-16 text-[var(--text-muted)]">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M14 2v6h6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm">No preview available for this file type</p>
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
