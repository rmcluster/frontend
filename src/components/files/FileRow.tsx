import { useState } from 'react';
import type { DavEntry } from '../../types/files';
import { extOf } from '../../types/files';
import { moveEntry, deleteEntry } from '../../lib/webdav';
import { FileEntryIcon } from './FileEntryIcon';
import { EntryActions } from './EntryActions';
import { Check, X } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { DeviceListCell } from './DeviceListCell';

export type FileRowProps = {
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

export function FileRow({
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
                className="shrink-0 p-1 rounded text-(--accent) hover:bg-(--bg-elevated) transition-colors cursor-pointer outline-none disabled:opacity-50"
                aria-label="Save rename"
              >
                <Check size={14} />
              </button>
              <button
                onClick={cancelRename}
                disabled={committing}
                className="shrink-0 p-1 rounded text-(--text-muted) hover:bg-(--bg-elevated) hover:text-(--text-primary) transition-colors cursor-pointer outline-none disabled:opacity-50"
                aria-label="Cancel rename"
              >
                <X size={14} />
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
        {entry.isDirectory ? 'Folder' : (() => {
          const parts = entry.name.split('.');
          if (parts.length < 2 || parts[0] === '') return '—';
          return parts.pop()?.toUpperCase() ?? '—';
        })()}
      </td>
      <td className="px-4 py-3 text-right font-(--font-mono) text-[0.8125rem] text-(--text-muted) tabular-nums hidden sm:table-cell">
        {entry.isDirectory ? '—' : (() => {
          const bytes = entry.size;
          if (bytes === null) return '—';
          if (bytes < 1024) return `${bytes} B`;
          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
          if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
          return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        })()}
      </td>
      <td className="px-4 py-3 text-right font-(--font-mono) text-[0.8125rem] text-(--text-muted) hidden md:table-cell">
        {(() => {
          const raw = entry.lastModified;
          if (!raw) return '—';
          const d = new Date(raw);
          return isNaN(d.getTime()) ? raw : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        })()}
      </td>
      <td className="px-4 py-3 text-right font-(--font-mono) text-[0.8125rem] text-(--text-muted) hidden lg:table-cell max-w-56 w-56">
        <DeviceListCell isDirectory={entry.isDirectory} devices={entry.devices} />
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
