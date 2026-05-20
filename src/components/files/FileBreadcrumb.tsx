type DroppedEntry = { path: string; name: string; isDirectory: boolean };

import { useRef, useState } from 'react';
import { ChevronRight, Check, X } from 'lucide-react';

type FileBreadcrumbProps = {
  path: string;
  onNavigate: (path: string) => void;
  fileSegment?: string;
  // rename props — when provided, the file segment becomes an inline input
  renamingFile?: boolean;
  renameValue?: string;
  renameSubmitting?: boolean;
  onRenameValueChange?: (val: string) => void;
  onRenameCommit?: () => void;
  onRenameCancel?: () => void;
  onRenameStart?: () => void;
  onDropToPath?: (entry: DroppedEntry, targetPath: string) => void;
};

export function FileBreadcrumb({
  path,
  onNavigate,
  fileSegment,
  renamingFile,
  renameValue = '',
  renameSubmitting,
  onRenameValueChange,
  onRenameCommit,
  onRenameCancel,
  onRenameStart,
  onDropToPath,
}: FileBreadcrumbProps) {
  const [dragOverCrumb, setDragOverCrumb] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const segments = path.split('/').filter(Boolean);

  const folderCrumbs = [
    { label: 'Home', path: '/' },
    ...segments.map((seg, i) => ({
      label: decodeURIComponent(seg),
      path: '/' + segments.slice(0, i + 1).join('/') + '/',
    })),
  ];

  const lastFolderIsClickable = !!fileSegment;

  return (
    <nav
      className="flex items-center gap-1 text-sm text-[var(--text-secondary)] overflow-x-auto whitespace-nowrap"
      aria-label="Breadcrumb"
    >
      {folderCrumbs.map((crumb, i) => {
        const isLast = i === folderCrumbs.length - 1;
        const clickable = !isLast || lastFolderIsClickable;
        return (
          <span key={crumb.path} className="flex items-center gap-1 min-w-0">
            {i > 0 && (
              <ChevronRight size={14} className="shrink-0 text-(--text-muted)" />
            )}
            {clickable ? (
              <button
                onClick={() => onNavigate(crumb.path)}
                onDragOver={(e) => {
                  if (!onDropToPath) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverCrumb(crumb.path);
                }}
                onDragLeave={() => setDragOverCrumb(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverCrumb(null);
                  if (!onDropToPath) return;
                  try {
                    const raw = e.dataTransfer.getData('application/panzerschreck-entry');
                    if (raw) onDropToPath(JSON.parse(raw) as DroppedEntry, crumb.path);
                  } catch { /* ignore malformed drag data */ }
                }}
                className={`hover:text-(--text-primary) hover:underline truncate transition-colors cursor-pointer outline-none rounded px-1 -mx-1 ${dragOverCrumb === crumb.path ? 'bg-(--accent)/15 text-(--accent)' : ''}`}
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-[var(--text-primary)] font-medium truncate">
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}

      {fileSegment && (
        <span className="flex items-center gap-1.5 min-w-0">
          <ChevronRight size={14} className="shrink-0 text-(--text-muted)" />
          {renamingFile ? (
            <>
              <input
                ref={inputRef}
                autoFocus
                value={renameValue}
                size={Math.max(renameValue.length + 2, 12)}
                onChange={(e) => onRenameValueChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); onRenameCommit?.(); }
                  if (e.key === 'Escape') onRenameCancel?.();
                }}
                className="text-sm px-1.5 py-0.5 bg-(--bg-input) border border-(--border-focus) rounded outline-none text-(--text-primary) min-w-0"
              />
              <button
                onClick={onRenameCommit}
                disabled={renameSubmitting}
                className="shrink-0 p-0.5 rounded text-(--accent) hover:bg-(--bg-elevated) transition-colors cursor-pointer outline-none disabled:opacity-50"
                aria-label="Save rename"
              >
                <Check size={13} />
              </button>
              <button
                onClick={onRenameCancel}
                className="shrink-0 p-0.5 rounded text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer outline-none"
                aria-label="Cancel rename"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <button
              onClick={onRenameStart}
              title="Click to rename"
              className="flex items-center gap-1 min-w-0 group cursor-pointer outline-none"
            >
              <span className="text-(--text-primary) font-medium truncate">
                {fileSegment}
              </span>
              <span className="shrink-0 opacity-0 group-hover:opacity-40 transition-opacity text-(--text-muted)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </span>
            </button>
          )}
        </span>
      )}
    </nav>
  );
}
