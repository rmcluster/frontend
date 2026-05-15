import { useState, useRef } from 'react';
import type { DavEntry } from '../../lib/webdav';
import { downloadUrl, deleteEntry, moveEntry } from '../../lib/webdav';
import { fileIconForEntry } from './FileIcon';
import { FileViewer } from './FileViewer';

type ViewMode = 'list' | 'grid';

type FileListProps = {
  entries: DavEntry[];
  viewMode: ViewMode;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
};

function formatSize(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(raw: string | null): string {
  if (!raw) return '—';
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

type EntryActionsProps = {
  entry: DavEntry;
  onRefresh: () => void;
  onView: () => void;
};

function EntryActions({ entry, onRefresh, onView }: EntryActionsProps) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(entry.name);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function handleOpen() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen(true);
  }

  async function handleDelete() {
    setOpen(false);
    if (!confirm(`Delete "${entry.name}"?`)) return;
    await deleteEntry(entry.path);
    onRefresh();
  }

  async function handleRename() {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === entry.name) { setRenaming(false); return; }
    const parentPath = entry.path.replace(/\/?[^/]+\/?$/, '/');
    const toPath = `${parentPath}${entry.isDirectory ? trimmed + '/' : trimmed}`;
    await moveEntry(entry.path, toPath);
    setRenaming(false);
    onRefresh();
  }

  if (renaming) {
    return (
      <input
        autoFocus
        className="text-sm px-2 py-0.5 bg-[var(--bg-input)] border border-[var(--accent)] rounded outline-none text-[var(--text-primary)]"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onBlur={handleRename}
        onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
      />
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer outline-none"
        aria-label="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="3" r="1.2" /><circle cx="8" cy="8" r="1.2" /><circle cx="8" cy="13" r="1.2" />
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
                onClick={() => { setOpen(false); onView(); }}
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
              onClick={() => { setOpen(false); setRenaming(true); }}
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer outline-none"
            >
              Rename
            </button>
            <button
              onClick={handleDelete}
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

export function FileList({ entries, viewMode, onNavigate, onRefresh }: FileListProps) {
  const [viewingEntry, setViewingEntry] = useState<DavEntry | null>(null);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[var(--text-muted)] gap-3">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span className="text-sm">This folder is empty</span>
      </div>
    );
  }

  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  function handleFileClick(entry: DavEntry) {
    setViewingEntry(entry);
  }

  if (viewMode === 'grid') {
    return (
      <>
        <FileViewer entry={viewingEntry} onClose={() => setViewingEntry(null)} />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-2">
          {sorted.map((entry) => {
            const Icon = fileIconForEntry(entry.isDirectory, entry.name, entry.contentType);
            return (
              <button
                key={entry.path}
                onClick={() => entry.isDirectory ? onNavigate(entry.path) : handleFileClick(entry)}
                className="group flex flex-col items-center gap-2 p-3 rounded-[var(--radius-lg)] border border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer outline-none text-center"
              >
                <Icon size={40} />
                <span className="text-xs text-[var(--text-primary)] line-clamp-2 break-all leading-tight w-full">{entry.name}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <>
      <FileViewer entry={viewingEntry} onClose={() => setViewingEntry(null)} />
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-xs text-[var(--text-muted)] uppercase tracking-wide">
            <th className="text-left py-2 px-3 font-semibold">Name</th>
            <th className="text-right py-2 px-3 font-semibold w-24 hidden sm:table-cell">Size</th>
            <th className="text-right py-2 px-3 font-semibold w-36 hidden md:table-cell">Modified</th>
            <th className="w-10"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => {
            const Icon = fileIconForEntry(entry.isDirectory, entry.name, entry.contentType);
            return (
              <tr
                key={entry.path}
                className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors group"
              >
                <td className="py-2 px-3">
                  <button
                    onClick={() => entry.isDirectory ? onNavigate(entry.path) : handleFileClick(entry)}
                    className="flex items-center gap-2.5 text-left text-[var(--text-primary)] cursor-pointer outline-none w-full"
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="truncate">{entry.name}</span>
                  </button>
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
                    onRefresh={onRefresh}
                    onView={() => handleFileClick(entry)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export type { ViewMode };
