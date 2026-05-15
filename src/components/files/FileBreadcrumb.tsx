type DroppedEntry = { path: string; name: string; isDirectory: boolean };

import { useState } from 'react';

type FileBreadcrumbProps = {
  path: string;
  onNavigate: (path: string) => void;
  fileSegment?: string;
  onRenameFile?: () => void;
  onDropToPath?: (entry: DroppedEntry, targetPath: string) => void;
};

const chevron = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    className="flex-shrink-0 text-[var(--text-muted)]"
    aria-hidden="true"
  >
    <path
      d="M5 3l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function FileBreadcrumb({
  path,
  onNavigate,
  fileSegment,
  onRenameFile,
  onDropToPath,
}: FileBreadcrumbProps) {
  const [dragOverCrumb, setDragOverCrumb] = useState<string | null>(null);
  const segments = path.split('/').filter(Boolean);

  const folderCrumbs = [
    { label: 'Home', path: '/' },
    ...segments.map((seg, i) => ({
      label: decodeURIComponent(seg),
      path: '/' + segments.slice(0, i + 1).join('/') + '/',
    })),
  ];

  // When viewing a file, all folder crumbs are clickable (none are "last")
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
            {i > 0 && chevron}
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
        <span className="flex items-center gap-1 min-w-0">
          {chevron}
          <span className="text-[var(--text-primary)] font-medium truncate max-w-[240px]">
            {fileSegment}
          </span>
          {onRenameFile && (
            <button
              onClick={onRenameFile}
              title="Rename file"
              className="shrink-0 p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer outline-none"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M9 1.5l2.5 2.5-7 7H2V8.5l7-7z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </span>
      )}
    </nav>
  );
}
