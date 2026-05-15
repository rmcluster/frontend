import { useState, useRef, useCallback } from 'react';
import type { DavEntry } from '../../lib/webdav';
import { downloadUrl, deleteEntry, moveEntry } from '../../lib/webdav';
import { FileEntryIcon } from './FileIcon';
import { ConfirmModal } from './ConfirmModal';
import { MoveToModal } from './MoveToModal';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/DropdownMenu';

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
  onMoveTo: () => void;
};

function EntryActions({ entry, onRename, onDelete, onView, onMoveTo }: EntryActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-1.5 rounded hover:bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer outline-none"
          aria-label="Actions"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <circle cx="8" cy="3" r="1.2" />
            <circle cx="8" cy="8" r="1.2" />
            <circle cx="8" cy="13" r="1.2" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {!entry.isDirectory && (
          <DropdownMenuItem onSelect={onView}>Open</DropdownMenuItem>
        )}
        {!entry.isDirectory && (
          <DropdownMenuItem asChild>
            <a href={downloadUrl(entry.path)} download={entry.name}>
              Download
            </a>
          </DropdownMenuItem>
        )}
        {!entry.isDirectory && <DropdownMenuSeparator />}
        <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem onSelect={onMoveTo}>Move to…</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger" onSelect={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
  draggingRef: React.RefObject<DavEntry | null>;
  dragOverPath: string | null;
  setDragOverPath: (p: string | null) => void;
  onDropOnFolder: (target: DavEntry) => void;
  onMoveTo: () => void;
};

function FileRow({
  entry,
  renamingPath,
  setRenamingPath,
  onNavigate,
  onOpenFile,
  onRefresh,
  draggingRef,
  dragOverPath,
  setDragOverPath,
  onDropOnFolder,
  onMoveTo,
}: FileRowProps) {
  const renaming = renamingPath === entry.path;
  const [newName, setNewName] = useState(entry.name);
  const [committing, setCommitting] = useState(false);
  const [extWarnNewName, setExtWarnNewName] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);

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

  const isDragTarget = dragOverPath === entry.path;

  function handleDragStart(e: React.DragEvent) {
    draggingRef.current = entry;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(
      'application/panzerschreck-entry',
      JSON.stringify({ path: entry.path, name: entry.name, isDirectory: entry.isDirectory })
    );
  }

  function handleDragEnd() {
    draggingRef.current = null;
    setDragOverPath(null);
  }

  function handleDragOver(e: React.DragEvent) {
    const dragging = draggingRef.current;
    if (!dragging || dragging.path === entry.path) return;
    if (dragging.isDirectory && entry.path.startsWith(dragging.path)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPath(entry.path);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverPath(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOverPath(null);
    onDropOnFolder(entry);
  }

  return (
    <tr
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={entry.isDirectory ? handleDragOver : undefined}
      onDragLeave={entry.isDirectory ? handleDragLeave : undefined}
      onDrop={entry.isDirectory ? handleDrop : undefined}
      className={`border-b border-(--border-subtle) transition-colors group ${isDragTarget ? 'bg-(--accent)/10 ring-2 ring-inset ring-(--accent)' : 'hover:bg-(--bg-elevated)'}`}
    >
      <td className="px-4 py-3">
        {renaming ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <FileEntryIcon isDirectory={entry.isDirectory} name={entry.name} contentType={entry.contentType} size={18} className="shrink-0" />
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
            <FileEntryIcon isDirectory={entry.isDirectory} name={entry.name} contentType={entry.contentType} size={18} className="shrink-0" />
            <span className="truncate">{entry.name}</span>
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-right font-(--font-mono) text-[0.8125rem] text-(--text-muted) hidden sm:table-cell">
        {formatType(entry)}
      </td>
      <td className="px-4 py-3 text-right font-(--font-mono) text-[0.8125rem] text-(--text-muted) tabular-nums hidden sm:table-cell">
        {entry.isDirectory ? '—' : formatSize(entry.size)}
      </td>
      <td className="px-4 py-3 text-right font-(--font-mono) text-[0.8125rem] text-(--text-muted) hidden md:table-cell">
        {formatDate(entry.lastModified)}
      </td>
      <td className="px-2 py-3">
        <EntryActions
          entry={entry}
          onRename={startRename}
          onDelete={handleDelete}
          onView={() => onOpenFile(entry)}
          onMoveTo={onMoveTo}
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
  const draggingRef = useRef<DavEntry | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [movingEntry, setMovingEntry] = useState<DavEntry | null>(null);

  async function handleMoveToPath(targetFolderPath: string) {
    if (!movingEntry) return;
    const toPath = `${targetFolderPath}${movingEntry.name}${movingEntry.isDirectory ? '/' : ''}`;
    await moveEntry(movingEntry.path, toPath);
    setMovingEntry(null);
    onRefresh();
  }

  const handleDropOnFolder = useCallback(
    async (target: DavEntry) => {
      const dragged = draggingRef.current;
      if (!dragged || dragged.path === target.path) return;
      if (dragged.isDirectory && target.path.startsWith(dragged.path)) return;
      const name = dragged.name;
      const toPath = `${target.path}${name}${dragged.isDirectory ? '/' : ''}`;
      try {
        await moveEntry(dragged.path, toPath);
        onRefresh();
      } catch {
        // silently ignore — user can retry
      }
    },
    [onRefresh]
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = entries.length > 0 ? sortEntries(entries, sortKey, sortDir) : [];

  const thBase =
    'font-(--font-mono) text-[0.72rem] uppercase tracking-[0.08em] text-(--text-muted) px-4 py-3 border-b border-(--border) select-none cursor-pointer hover:text-(--text-primary) transition-colors';

  return (
    <div className="contents">
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-(--text-muted) gap-3">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          <span className="text-sm">This folder is empty</span>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-2">
          {sorted.map((entry) => {
            const isDragTarget = dragOverPath === entry.path;
            return (
              <button
                key={entry.path}
                draggable
                onClick={() => entry.isDirectory ? onNavigate(entry.path) : onOpenFile(entry)}
                onDragStart={(e) => {
                  draggingRef.current = entry;
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData(
                    'application/panzerschreck-entry',
                    JSON.stringify({ path: entry.path, name: entry.name, isDirectory: entry.isDirectory })
                  );
                }}
                onDragEnd={() => {
                  draggingRef.current = null;
                  setDragOverPath(null);
                }}
                onDragOver={entry.isDirectory ? (e) => {
                  const dragging = draggingRef.current;
                  if (!dragging || dragging.path === entry.path) return;
                  if (dragging.isDirectory && entry.path.startsWith(dragging.path)) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverPath(entry.path);
                } : undefined}
                onDragLeave={entry.isDirectory ? (e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverPath(null);
                } : undefined}
                onDrop={entry.isDirectory ? (e) => {
                  e.preventDefault();
                  setDragOverPath(null);
                  handleDropOnFolder(entry);
                } : undefined}
                className={`group flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors cursor-pointer outline-none text-center ${
                  isDragTarget
                    ? 'border-(--accent) bg-(--accent)/10 ring-2 ring-(--accent)'
                    : 'border-transparent hover:border-(--border) hover:bg-(--bg-elevated)'
                }`}
              >
                <FileEntryIcon isDirectory={entry.isDirectory} name={entry.name} contentType={entry.contentType} size={40} />
                <span className="text-xs text-(--text-primary) line-clamp-2 break-all leading-tight w-full">
                  {entry.name}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className={`${thBase} text-left`} onClick={() => handleSort('name')}>
                <span className="inline-flex items-center gap-1">
                  Name <SortIcon active={sortKey === 'name'} dir={sortDir} />
                </span>
              </th>
              <th className={`${thBase} text-right w-20 hidden sm:table-cell`} onClick={() => handleSort('type')}>
                <span className="inline-flex items-center justify-end gap-1">
                  Type <SortIcon active={sortKey === 'type'} dir={sortDir} />
                </span>
              </th>
              <th className={`${thBase} text-right w-24 hidden sm:table-cell`} onClick={() => handleSort('size')}>
                <span className="inline-flex items-center justify-end gap-1">
                  Size <SortIcon active={sortKey === 'size'} dir={sortDir} />
                </span>
              </th>
              <th className={`${thBase} text-right w-36 hidden md:table-cell`} onClick={() => handleSort('modified')}>
                <span className="inline-flex items-center justify-end gap-1">
                  Modified <SortIcon active={sortKey === 'modified'} dir={sortDir} />
                </span>
              </th>
              <th className="w-10 border-b border-(--border)">
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
                draggingRef={draggingRef}
                dragOverPath={dragOverPath}
                setDragOverPath={setDragOverPath}
                onDropOnFolder={handleDropOnFolder}
                onMoveTo={() => setMovingEntry(entry)}
              />
            ))}
          </tbody>
        </table>
      )}
      <MoveToModal
        open={movingEntry !== null}
        entry={movingEntry}
        onClose={() => setMovingEntry(null)}
        onMove={handleMoveToPath}
      />
    </div>
  );
}

export type { ViewMode };
