import { useState, useRef } from 'react';
import type { DavEntry } from '../../lib/webdav';
import { downloadUrl, deleteEntry, moveEntry } from '../../lib/webdav';
import { fileIconForEntry } from './FileIcon';
import { ConfirmModal } from './ConfirmModal';

type ViewMode = 'list' | 'grid';

type SortKey = 'name' | 'type' | 'size' | 'modified';
type SortDir = 'asc' | 'desc';

type FileListProps = {
  entries: DavEntry[];
  viewMode: ViewMode;
  onNavigate: (path: string) => void;
  onOpenFile: (entry: DavEntry) => void;
  onRefresh: () => void;
};

function formatSize(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatType(entry: DavEntry): string {
  if (entry.isDirectory) return 'Folder';
  const parts = entry.name.split('.');
  if (parts.length < 2 || parts[0] === '') return '—';
  return parts.pop()?.toUpperCase() ?? '—';
}

function formatDate(raw: string | null): string {
  if (!raw) return '—';
  const d = new Date(raw);
  return isNaN(d.getTime())
    ? raw
    : d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
}

function extOf(name: string): string {
  const parts = name.split('.');
  if (parts.length < 2 || parts[0] === '') return '';
  return parts.pop()?.toLowerCase() ?? '';
}

// ── Actions menu ─────────────────────────────────────────────────────────────

type EntryActionsProps = {
  entry: DavEntry;
  onRename: () => void;
  onDelete: () => void;
  onView: () => void;
};

function EntryActions({
  entry,
  onRename,
  onDelete,
  onView,
}: EntryActionsProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null
  );
  const buttonRef = useRef<HTMLButtonElement>(null);

  function handleOpen() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(true);
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer outline-none"
        aria-label="Actions"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="8" cy="3" r="1.2" />
          <circle cx="8" cy="8" r="1.2" />
          <circle cx="8" cy="13" r="1.2" />
        </svg>
      </button>

      {open && menuPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-40 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-lg)] py-1 text-sm"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            {!entry.isDirectory && (
              <button
                onClick={() => {
                  setOpen(false);
                  onView();
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer outline-none"
              >
                Open
              </button>
            )}
            {!entry.isDirectory && (
              <a
                href={downloadUrl(entry.path)}
                download={entry.name}
                className="flex items-center gap-2 px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                onClick={() => setOpen(false)}
              >
                Download
              </a>
            )}
            <button
              onClick={() => {
                setOpen(false);
                onRename();
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer outline-none"
            >
              Rename
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-[var(--danger)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer outline-none"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

type FileRowProps = {
  entry: DavEntry;
  renamingPath: string | null;
  setRenamingPath: (p: string | null) => void;
  onNavigate: (path: string) => void;
  onOpenFile: (entry: DavEntry) => void;
  onRefresh: () => void;
};

function FileRow({
  entry,
  renamingPath,
  setRenamingPath,
  onNavigate,
  onOpenFile,
  onRefresh,
}: FileRowProps) {
  const renaming = renamingPath === entry.path;
  const [newName, setNewName] = useState(entry.name);
  const [committing, setCommitting] = useState(false);
  const [extWarnNewName, setExtWarnNewName] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);

  const Icon = fileIconForEntry(
    entry.isDirectory,
    entry.name,
    entry.contentType
  );

  function startRename() {
    setNewName(entry.name);
    setExtWarnNewName(null);
    setRenameError(null);
    setRenamingPath(entry.path);
  }

  function cancelRename() {
    setRenamingPath(null);
    setNewName(entry.name);
    setExtWarnNewName(null);
    setRenameError(null);
  }

  async function doRename(name: string) {
    setCommitting(true);
    setRenameError(null);
    try {
      const parentPath = entry.path.replace(/\/?[^/]+\/?$/, '/');
      const toPath = `${parentPath}${entry.isDirectory ? name + '/' : name}`;
      await moveEntry(entry.path, toPath);
      setRenamingPath(null);
      setExtWarnNewName(null);
      onRefresh();
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : 'Rename failed');
    } finally {
      setCommitting(false);
    }
  }

  async function commitRename() {
    if (committing || extWarnNewName) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === entry.name) {
      cancelRename();
      return;
    }

    if (!entry.isDirectory) {
      const oldExt = extOf(entry.name);
      const newExt = extOf(trimmed);
      if (oldExt && newExt && oldExt !== newExt) {
        setExtWarnNewName(trimmed);
        return;
      }
    }

    await doRename(trimmed);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${entry.name}"?`)) return;
    await deleteEntry(entry.path);
    onRefresh();
  }

  return (
    <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors group">
      <td className="py-2 px-3">
        {renaming ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Icon size={18} className="flex-shrink-0" />
              <input
                autoFocus
                className="flex-1 min-w-0 text-sm px-2 py-0.5 bg-[var(--bg-input)] border border-[var(--accent)] rounded outline-none text-[var(--text-primary)]"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setExtWarnNewName(null);
                  setRenameError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitRename();
                  }
                  if (e.key === 'Escape') cancelRename();
                }}
              />
              <button
                onClick={commitRename}
                disabled={committing}
                className="flex-shrink-0 p-1 rounded text-[var(--accent)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer outline-none disabled:opacity-50"
                aria-label="Save rename"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 7l4 4 6-7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                onClick={cancelRename}
                disabled={committing}
                className="flex-shrink-0 p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors cursor-pointer outline-none disabled:opacity-50"
                aria-label="Cancel rename"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 3l8 8M11 3L3 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <ConfirmModal
              open={extWarnNewName !== null && !renameError}
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
                  disabled: committing,
                  onClick: () => {
                    if (extWarnNewName) doRename(extWarnNewName);
                  },
                },
              ]}
            />
            {renameError && (
              <div className="ml-6 flex items-center gap-2 text-xs bg-[var(--bg-elevated)] rounded px-2 py-1">
                <span className="text-[var(--danger,#ef4444)]">
                  {renameError}
                </span>
                <button
                  onClick={cancelRename}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer outline-none"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() =>
              entry.isDirectory ? onNavigate(entry.path) : onOpenFile(entry)
            }
            className="flex items-center gap-2.5 text-left text-[var(--text-primary)] cursor-pointer outline-none w-full"
          >
            <Icon size={18} className="flex-shrink-0" />
            <span className="truncate">{entry.name}</span>
          </button>
        )}
      </td>
      <td className="py-2 px-3 text-right text-[var(--text-muted)] hidden sm:table-cell">
        {formatType(entry)}
      </td>
      <td className="py-2 px-3 text-right text-[var(--text-muted)] tabular-nums hidden sm:table-cell">
        {entry.isDirectory ? '—' : formatSize(entry.size)}
      </td>
      <td className="py-2 px-3 text-right text-[var(--text-muted)] hidden md:table-cell">
        {formatDate(entry.lastModified)}
      </td>
      <td className="py-2 px-1">
        <EntryActions
          entry={entry}
          onRename={startRename}
          onDelete={handleDelete}
          onView={() => onOpenFile(entry)}
        />
      </td>
    </tr>
  );
}

// ── Sort helpers ──────────────────────────────────────────────────────────────

function sortEntries(
  entries: DavEntry[],
  key: SortKey,
  dir: SortDir
): DavEntry[] {
  const mul = dir === 'asc' ? 1 : -1;
  return [...entries].sort((a, b) => {
    // Always folders first regardless of sort
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;

    let cmp = 0;
    if (key === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else if (key === 'type') {
      const ta = a.isDirectory ? '' : extOf(a.name);
      const tb = b.isDirectory ? '' : extOf(b.name);
      cmp = ta.localeCompare(tb);
    } else if (key === 'size') {
      cmp = (a.size ?? -1) - (b.size ?? -1);
    } else if (key === 'modified') {
      const da = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const db = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      cmp = da - db;
    }
    return cmp * mul;
  });
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active)
    return (
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        className="opacity-30"
        aria-hidden="true"
      >
        <path
          d="M5 1v8M2 4l3-3 3 3M2 7l3 3 3-3"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  return dir === 'asc' ? (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 8V2M2 5l3-3 3 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 2v6M2 5l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── FileList ──────────────────────────────────────────────────────────────────

export function FileList({
  entries,
  viewMode,
  onNavigate,
  onOpenFile,
  onRefresh,
}: FileListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[var(--text-muted)] gap-3">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        <span className="text-sm">This folder is empty</span>
      </div>
    );
  }

  const sorted = sortEntries(entries, sortKey, sortDir);

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-2">
        {sorted.map((entry) => {
          const Icon = fileIconForEntry(
            entry.isDirectory,
            entry.name,
            entry.contentType
          );
          return (
            <button
              key={entry.path}
              onClick={() =>
                entry.isDirectory ? onNavigate(entry.path) : onOpenFile(entry)
              }
              className="group flex flex-col items-center gap-2 p-3 rounded-[var(--radius-lg)] border border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer outline-none text-center"
            >
              <Icon size={40} />
              <span className="text-xs text-[var(--text-primary)] line-clamp-2 break-all leading-tight w-full">
                {entry.name}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  const thClass =
    'text-right py-2 px-3 font-semibold select-none cursor-pointer hover:text-[var(--text-primary)] transition-colors';

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-[var(--border-subtle)] text-xs text-[var(--text-muted)] uppercase tracking-wide">
          <th
            className="text-left py-2 px-3 font-semibold select-none cursor-pointer hover:text-[var(--text-primary)] transition-colors"
            onClick={() => handleSort('name')}
          >
            <span className="inline-flex items-center gap-1">
              Name <SortIcon active={sortKey === 'name'} dir={sortDir} />
            </span>
          </th>
          <th
            className={`${thClass} w-20 hidden sm:table-cell`}
            onClick={() => handleSort('type')}
          >
            <span className="inline-flex items-center justify-end gap-1">
              Type <SortIcon active={sortKey === 'type'} dir={sortDir} />
            </span>
          </th>
          <th
            className={`${thClass} w-24 hidden sm:table-cell`}
            onClick={() => handleSort('size')}
          >
            <span className="inline-flex items-center justify-end gap-1">
              Size <SortIcon active={sortKey === 'size'} dir={sortDir} />
            </span>
          </th>
          <th
            className={`${thClass} w-36 hidden md:table-cell`}
            onClick={() => handleSort('modified')}
          >
            <span className="inline-flex items-center justify-end gap-1">
              Modified{' '}
              <SortIcon active={sortKey === 'modified'} dir={sortDir} />
            </span>
          </th>
          <th className="w-10">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((entry) => (
          <FileRow
            key={entry.path}
            entry={entry}
            renamingPath={renamingPath}
            setRenamingPath={setRenamingPath}
            onNavigate={onNavigate}
            onOpenFile={onOpenFile}
            onRefresh={onRefresh}
          />
        ))}
      </tbody>
    </table>
  );
}

export type { ViewMode };
