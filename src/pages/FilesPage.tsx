import { useState, useEffect, useCallback } from 'react';
import { listDir, createFolder } from '../lib/webdav';
import type { DavEntry } from '../lib/webdav';
import { PageHeader } from '../components/PageHeader';
import { FileBreadcrumb } from '../components/files/FileBreadcrumb';
import { FileList, type ViewMode } from '../components/files/FileList';
import { NewFolderModal } from '../components/files/NewFolderModal';
import { UploadButton } from '../components/files/UploadButton';

export function FilesPage() {
  const [currentPath, setCurrentPath] = useState('/');
  const [entries, setEntries] = useState<DavEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [folderModalOpen, setFolderModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await listDir(currentPath);
      setEntries(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => { load(); }, [load]);

  async function handleCreateFolder(name: string) {
    const path = `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${name}/`;
    await createFolder(path);
    await load();
  }

  function navigate(path: string) {
    setCurrentPath(path);
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <PageHeader
        title="Files"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFolderModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer outline-none"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              New Folder
            </button>
            <UploadButton currentPath={currentPath} onUploaded={load} />
          </div>
        }
      />

      <div className="mt-4 mb-3 flex items-center justify-between gap-4">
        <FileBreadcrumb path={currentPath} onNavigate={navigate} />
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setViewMode('list')}
            aria-label="List view"
            className={`p-1.5 rounded transition-colors cursor-pointer outline-none ${viewMode === 'list' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor" />
              <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor" />
              <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            className={`p-1.5 rounded transition-colors cursor-pointer outline-none ${viewMode === 'grid' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="2" y="9" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-9 rounded-md bg-[var(--bg-elevated)] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-muted)]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-sm">{error}</p>
            <button
              onClick={load}
              className="text-sm text-[var(--accent)] hover:underline cursor-pointer outline-none"
            >
              Try again
            </button>
          </div>
        ) : (
          <FileList
            entries={entries}
            viewMode={viewMode}
            onNavigate={navigate}
            onRefresh={load}
          />
        )}
      </div>

      <NewFolderModal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        onCreate={handleCreateFolder}
      />
    </div>
  );
}
