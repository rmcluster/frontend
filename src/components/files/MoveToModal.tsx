import { useState, useEffect } from 'react';
import type { DavEntry } from '../../types/files';
import { listDir } from '../../lib/webdav';
import { Folder, ChevronRight, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/Dialog';

type MoveToModalProps = {
  open: boolean;
  entry: DavEntry | null;
  onClose: () => void;
  onMove: (targetFolderPath: string) => Promise<void>;
};

export function MoveToModal({ open, entry, onClose, onMove }: MoveToModalProps) {
  const [browsePath, setBrowsePath] = useState('/');
  const [folders, setFolders] = useState<DavEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  // Reset to root each time the modal opens
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setBrowsePath('/');
  }, [open]);

  // Load folders whenever browse path changes while open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    listDir(browsePath)
      .then((entries) => {
        if (cancelled) return;
        setFolders(entries.filter((e) => e.isDirectory));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, browsePath]);

  if (!entry) return null;

  // Parent folder of the entry being moved
  const parentPath = entry.path.replace(/\/?[^/]+\/?$/, '/') || '/';

  const isInsideSelf = entry.isDirectory && browsePath.startsWith(entry.path);
  const isAlreadyHere = browsePath === parentPath;
  const cantMove = isAlreadyHere || isInsideSelf;

  async function handleMove() {
    if (cantMove || moving) return;
    setMoving(true);
    try {
      await onMove(browsePath);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Move failed');
    } finally {
      setMoving(false);
    }
  }

  // Breadcrumb segments for the current browse path
  const segments = browsePath.split('/').filter(Boolean);
  const crumbs = [
    { label: 'Home', path: '/' },
    ...segments.map((seg, i) => ({
      label: decodeURIComponent(seg),
      path: '/' + segments.slice(0, i + 1).join('/') + '/',
    })),
  ];

  const moveLabel = moving ? 'Moving…' : isAlreadyHere ? 'Already here' : isInsideSelf ? 'Can\'t move here' : 'Move here';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move "{entry.name}" to…</DialogTitle>
        </DialogHeader>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 flex-wrap text-xs text-(--text-secondary) mb-2 overflow-x-auto whitespace-nowrap" aria-label="Browse path">
          {crumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight size={10} className="shrink-0 text-(--text-muted)" />}
              <button
                onClick={() => setBrowsePath(crumb.path)}
                className={`truncate cursor-pointer outline-none hover:underline transition-colors ${crumb.path === browsePath ? 'text-(--text-primary) font-semibold' : 'hover:text-(--text-primary)'}`}
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </nav>

        {/* Folder browser */}
        <div className="h-52 overflow-y-auto border border-(--border) rounded-lg bg-(--bg-elevated)">
          {loading ? (
            <div className="flex flex-col gap-1.5 p-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 rounded-md bg-(--bg-surface) animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-xs text-(--danger)">
              {error}
            </div>
          ) : folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-1 text-xs text-(--text-muted)">
              <FolderOpen size={24} />
              No subfolders here
            </div>
          ) : (
            <div className="p-1">
              {folders.map((folder) => {
                const disabled = entry.isDirectory && folder.path.startsWith(entry.path);
                return (
                  <button
                    key={folder.path}
                    onClick={() => !disabled && setBrowsePath(folder.path)}
                    disabled={disabled}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-(--text-primary) hover:bg-(--bg-surface) transition-colors cursor-pointer outline-none disabled:opacity-40 disabled:cursor-not-allowed text-left"
                  >
                    <Folder size={16} className="shrink-0 text-(--accent)" />
                    <span className="truncate">{folder.name}</span>
                    <ChevronRight size={12} className="ml-auto shrink-0 text-(--text-muted)" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Destination indicator */}
        <p className="mt-2 text-xs text-(--text-muted) truncate">
          Destination:{' '}
          <span className="font-(--font-mono) text-(--text-primary)">{browsePath}</span>
        </p>

        {error && !loading && (
          <p className="mt-1 text-xs text-(--danger)">{error}</p>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent) transition-colors cursor-pointer outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={cantMove || moving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--accent) text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {moveLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
