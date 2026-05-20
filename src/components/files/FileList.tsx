import { useState, useRef, useCallback } from 'react';
import type { DavEntry, ViewMode } from '../../types/files';
import { extOf } from '../../types/files';
import { moveEntry } from '../../lib/webdav';
import { ArrowUp, ArrowDown, ArrowUpDown, FolderOpen } from 'lucide-react';
import { FileEntryIcon } from './FileEntryIcon';
import { FileRow } from './FileRow';
import { MoveToModal } from './MoveToModal';

type SortKey = 'name' | 'type' | 'size' | 'modified';
type SortDir = 'asc' | 'desc';

type FileListProps = {
  entries: DavEntry[];
  viewMode: ViewMode;
  onNavigate: (path: string) => void;
  onOpenFile: (entry: DavEntry) => void;
  onRefresh: () => void;
};

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
          <FolderOpen size={48} />
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
                  Name {sortKey === 'name' ? (sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}
                </span>
              </th>
              <th className={`${thBase} text-right w-20 hidden sm:table-cell`} onClick={() => handleSort('type')}>
                <span className="inline-flex items-center justify-end gap-1">
                  Type {sortKey === 'type' ? (sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}
                </span>
              </th>
              <th className={`${thBase} text-right w-24 hidden sm:table-cell`} onClick={() => handleSort('size')}>
                <span className="inline-flex items-center justify-end gap-1">
                  Size {sortKey === 'size' ? (sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}
                </span>
              </th>
              <th className={`${thBase} text-right w-36 hidden md:table-cell`} onClick={() => handleSort('modified')}>
                <span className="inline-flex items-center justify-end gap-1">
                  Modified {sortKey === 'modified' ? (sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}
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

export type { ViewMode } from '../../types/files';
