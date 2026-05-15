import { useState, useRef } from 'react';
import type { DavEntry } from '../../lib/webdav';
import { downloadUrl, deleteEntry, moveEntry } from '../../lib/webdav';
import { fileIconForEntry } from './FileIcon';

type ViewMode = 'list' | 'grid';

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
  onNavigate: (path: string) => void;
  onOpenFile: (entry: DavEntry) => void;
  onRefresh: () => void;
};

function FileRow({ entry, onNavigate, onOpenFile, onRefresh }: FileRowProps) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(entry.name);
  const Icon = fileIconForEntry(
    entry.isDirectory,
    entry.name,
    entry.contentType
  );

  async function commitRename() {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === entry.name) {
      setRenaming(false);
      setNewName(entry.name);
      return;
    }
    const parentPath = entry.path.replace(/\/?[^/]+\/?$/, '/');
    const toPath = `${parentPath}${entry.isDirectory ? trimmed + '/' : trimmed}`;
    await moveEntry(entry.path, toPath);
    setRenaming(false);
    onRefresh();
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
          <div className="flex items-center gap-2.5">
            <Icon size={18} className="flex-shrink-0" />
            <input
              autoFocus
              className="flex-1 text-sm px-2 py-0.5 bg-[var(--bg-input)] border border-[var(--accent)] rounded outline-none text-[var(--text-primary)]"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') {
                  setRenaming(false);
                  setNewName(entry.name);
                }
              }}
            />
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
      <td className="py-2 px-3 text-right text-[var(--text-muted)] tabular-nums hidden sm:table-cell">
        {entry.isDirectory ? '—' : formatSize(entry.size)}
      </td>
      <td className="py-2 px-3 text-right text-[var(--text-muted)] hidden md:table-cell">
        {formatDate(entry.lastModified)}
      </td>
      <td className="py-2 px-1">
        <EntryActions
          entry={entry}
          onRename={() => {
            setNewName(entry.name);
            setRenaming(true);
          }}
          onDelete={handleDelete}
          onView={() => onOpenFile(entry)}
        />
      </td>
    </tr>
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

  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

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

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-[var(--border-subtle)] text-xs text-[var(--text-muted)] uppercase tracking-wide">
          <th className="text-left py-2 px-3 font-semibold">Name</th>
          <th className="text-right py-2 px-3 font-semibold w-24 hidden sm:table-cell">
            Size
          </th>
          <th className="text-right py-2 px-3 font-semibold w-36 hidden md:table-cell">
            Modified
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
