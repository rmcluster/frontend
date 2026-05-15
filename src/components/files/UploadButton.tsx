import { useRef, useState, type DragEvent } from 'react';
import { uploadFile } from '../../lib/webdav';

type UploadButtonProps = {
  currentPath: string;
  onUploaded: () => void;
};

export function UploadButton({ currentPath, onUploaded }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    setProgress(0);
    try {
      for (let i = 0; i < arr.length; i++) {
        await uploadFile(currentPath, arr[i], (pct) => {
          setProgress(((i + pct / 100) / arr.length) * 100);
        });
      }
      onUploaded();
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />

      {/* Drag-and-drop overlay — only shown when dragging */}
      {dragging && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--accent)]/10 border-2 border-dashed border-[var(--accent)] pointer-events-none"
          aria-hidden="true"
        >
          <div className="text-[var(--accent)] text-lg font-semibold">
            Drop files to upload
          </div>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="contents"
      >
        <button
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                className="animate-spin"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="7"
                  cy="7"
                  r="5.5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeDasharray="20 14"
                />
              </svg>
              {progress !== null ? `${Math.round(progress)}%` : 'Uploading…'}
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7 2v8M4 5l3-3 3 3"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 11h10"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Upload
            </>
          )}
        </button>
      </div>
    </>
  );
}
