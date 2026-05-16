import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listDir, createFolder, createFile, moveEntry } from '../lib/webdav';
import type { DavEntry, ViewMode } from '../types/files';
import { PageHeader } from '../components/PageHeader';
import { FileBreadcrumb } from '../components/files/FileBreadcrumb';
import { FileList } from '../components/files/FileList';
import { FileViewer } from '../components/files/FileViewer';
import { NewFolderModal } from '../components/files/NewFolderModal';
import { NewFileModal } from '../components/files/NewFileModal';
import { UploadButton } from '../components/files/UploadButton';
import { FilePlus, Plus, List, LayoutGrid, Info } from 'lucide-react';

export function FilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // currentPath is derived from ?path= so reload and browser back/forward work
  const currentPath = searchParams.get('path') ?? '/';

  const filePath = searchParams.get('file');
  const fileMode = searchParams.get('mode') as 'preview' | 'edit' | null;

  const [entries, setEntries] = useState<DavEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<DavEntry | null>(null);
  const [renameSignal, setRenameSignal] = useState(0);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Restore viewed file from URL after directory entries load
  useEffect(() => {
    if (!filePath || viewingEntry) return;
    const found = entries.find((e) => e.path === filePath);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (found) setViewingEntry(found);
    // viewingEntry intentionally omitted — only run when entries/filePath change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, filePath]);

  function buildParams(overrides: Record<string, string | null>) {
    const params: Record<string, string> = {};
    if (currentPath !== '/') params.path = currentPath;
    if (filePath) params.file = filePath;
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) delete params[k];
      else params[k] = v;
    }
    return params;
  }

  function navigate(path: string) {
    setViewingEntry(null);
    if (path === '/') {
      setSearchParams({}, { replace: false });
    } else {
      setSearchParams({ path }, { replace: false });
    }
  }

  function openFile(entry: DavEntry) {
    setViewingEntry(entry);
    setSearchParams(buildParams({ file: entry.path }), { replace: false });
  }

  function closeViewer() {
    setViewingEntry(null);
    setSearchParams(buildParams({ file: null }), { replace: false });
  }

  function handleFileModeChange(mode: 'preview' | 'edit') {
    setSearchParams(buildParams({ mode }), { replace: true });
  }

  function handleViewerRename(updated: DavEntry) {
    setViewingEntry(updated);
    // replace so back-button doesn't restore the old filename in the URL
    setSearchParams(buildParams({ file: updated.path }), { replace: true });
  }

  async function handleDropToPath(
    entry: { path: string; name: string; isDirectory: boolean },
    targetPath: string
  ) {
    const toPath = `${targetPath}${entry.name}${entry.isDirectory ? '/' : ''}`;
    if (toPath === entry.path) return;
    await moveEntry(entry.path, toPath);
    await load();
  }

  async function handleCreateFolder(name: string) {
    const path = `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${name}/`;
    await createFolder(path);
    await load();
  }

  async function handleCreateFile(name: string) {
    const path = `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${name}`;
    await createFile(path);
    await load();
    const entry: DavEntry = {
      name,
      path,
      isDirectory: false,
      size: 0,
      lastModified: new Date().toISOString(),
      contentType: null,
    };
    openFile(entry);
  }

  const isViewing = viewingEntry !== null;

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <PageHeader
        title="Files"
        actions={
          !isViewing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFileModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer outline-none"
              >
                <FilePlus size={14} />
                New File
              </button>
              <button
                onClick={() => setFolderModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer outline-none"
              >
                <Plus size={14} />
                New Folder
              </button>
              <UploadButton currentPath={currentPath} onUploaded={load} />
            </div>
          ) : undefined
        }
      />

      <div className="mt-4 mb-3 flex items-center justify-between gap-4">
        <FileBreadcrumb
          path={currentPath}
          onNavigate={navigate}
          fileSegment={viewingEntry?.name}
          onRenameFile={viewingEntry ? () => setRenameSignal((s) => s + 1) : undefined}
          onDropToPath={handleDropToPath}
        />
        {!isViewing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-1.5 rounded transition-colors cursor-pointer outline-none ${viewMode === 'list' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-1.5 rounded transition-colors cursor-pointer outline-none ${viewMode === 'grid' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
        {isViewing ? (
          <FileViewer
            entry={viewingEntry}
            onClose={closeViewer}
            onRename={handleViewerRename}
            fileMode={fileMode}
            onFileModeChange={handleFileModeChange}
            renameSignal={renameSignal}
          />
        ) : loading ? (
          <div className="flex flex-col gap-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-9 rounded-md bg-[var(--bg-elevated)] animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-muted)]">
            <Info size={40} />
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
            onOpenFile={openFile}
            onRefresh={load}
          />
        )}
      </div>

      <NewFolderModal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        onCreate={handleCreateFolder}
      />
      <NewFileModal
        open={fileModalOpen}
        onClose={() => setFileModalOpen(false)}
        onCreate={handleCreateFile}
      />
    </div>
  );
}
