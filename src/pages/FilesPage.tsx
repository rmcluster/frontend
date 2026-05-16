import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listDir, createFolder, createFile, moveEntry, downloadUrl } from '../lib/webdav';
import type { DavEntry, ViewMode } from '../types/files';
import { extOf, classify } from '../types/files';
import { PageHeader } from '../components/PageHeader';
import { FileBreadcrumb } from '../components/files/FileBreadcrumb';
import { FileList } from '../components/files/FileList';
import { FileViewer } from '../components/files/FileViewer';
import type { FileViewerHandle } from '../components/files/FileViewer';
import { NewFolderModal } from '../components/files/NewFolderModal';
import { NewFileModal } from '../components/files/NewFileModal';
import { UploadButton } from '../components/files/UploadButton';
import { StateDisplay, SkeletonRows } from '../components/StateDisplay';
import { ChevronLeft, FilePlus, Plus, List, LayoutGrid } from 'lucide-react';

export function FilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
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

  const viewerRef = useRef<FileViewerHandle>(null);

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

  // Restore viewed file from URL once entries are available.
  useEffect(() => {
    if (!filePath || viewingEntry || loading) return;
    const found = entries.find((e) => e.path === filePath);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (found) setViewingEntry(found);
    // viewingEntry intentionally omitted — only run when entries/filePath/loading change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, filePath, loading]);

  // Derive viewer state from the current viewing entry
  const viewingExt = viewingEntry ? extOf(viewingEntry.name) : null;
  const viewingIsStructured = viewingExt === 'csv' || viewingExt === 'json' || viewingExt === 'md';
  const viewingKind = viewingEntry ? classify(viewingEntry.name, viewingEntry.contentType) : null;
  const viewingPreview = fileMode != null ? fileMode === 'preview' : viewingIsStructured;

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
    setSearchParams(buildParams({ file: entry.path, mode: null }), { replace: false });
  }

  function closeViewer() {
    setViewingEntry(null);
    setSearchParams(buildParams({ file: null, mode: null }), { replace: false });
  }

  function handleFileModeChange(mode: 'preview' | 'edit') {
    setSearchParams(buildParams({ mode }), { replace: true });
  }

  function handleViewerRename(updated: DavEntry) {
    setViewingEntry(updated);
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
  const awaitingEntry = !!filePath && !isViewing && loading;
  const fileNotFound = !!filePath && !isViewing && !loading;

  return (
    <>
      <PageHeader
        eyebrow="Storage"
        title="Files"
        actions={
          isViewing && viewingEntry ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => viewerRef.current?.tryClose()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent) transition-colors cursor-pointer outline-none"
              >
                <ChevronLeft size={14} />
                Back
              </button>

              {viewingKind === 'text' && viewingIsStructured && (
                <div className="flex items-center border border-(--border) rounded-md overflow-hidden shrink-0">
                  <button
                    onClick={() => handleFileModeChange('preview')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer outline-none ${viewingPreview ? 'bg-(--accent) text-white' : 'bg-(--bg-surface) text-(--text-muted) hover:text-(--text-primary)'}`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleFileModeChange('edit')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer outline-none ${!viewingPreview ? 'bg-(--accent) text-white' : 'bg-(--bg-surface) text-(--text-muted) hover:text-(--text-primary)'}`}
                  >
                    Edit
                  </button>
                </div>
              )}

              {viewingKind === 'text' && (
                <button
                  onClick={() => viewerRef.current?.save()}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--accent) text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none ${viewingPreview ? 'invisible pointer-events-none' : ''}`}
                >
                  Save
                </button>
              )}

              <a
                href={downloadUrl(viewingEntry.path)}
                download={viewingEntry.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent) transition-colors outline-none"
              >
                Download
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFileModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent) transition-colors cursor-pointer outline-none"
              >
                <FilePlus size={14} />
                New File
              </button>
              <button
                onClick={() => setFolderModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent) transition-colors cursor-pointer outline-none"
              >
                <Plus size={14} />
                New Folder
              </button>
              <UploadButton currentPath={currentPath} onUploaded={load} />
            </div>
          )
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
              className={`p-1.5 rounded transition-colors cursor-pointer outline-none ${viewMode === 'list' ? 'bg-(--bg-elevated) text-(--text-primary)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-1.5 rounded transition-colors cursor-pointer outline-none ${viewMode === 'grid' ? 'bg-(--bg-elevated) text-(--text-primary)' : 'text-(--text-muted) hover:text-(--text-primary)'}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        )}
      </div>

      {isViewing && viewingEntry ? (
        <div className="bg-(--bg-surface) border border-(--border) rounded-xl overflow-hidden">
          <FileViewer
            ref={viewerRef}
            entry={viewingEntry}
            onClose={closeViewer}
            onRename={handleViewerRename}
            preview={viewingPreview}
            renameSignal={renameSignal}
          />
        </div>
      ) : awaitingEntry ? (
        <SkeletonRows count={3} />
      ) : fileNotFound ? (
        <StateDisplay error={`File not found: ${filePath}`} onRetry={load} />
      ) : (
        <StateDisplay loading={loading} error={error} onRetry={load}>
          <FileList
            entries={entries}
            viewMode={viewMode}
            onNavigate={navigate}
            onOpenFile={openFile}
            onRefresh={load}
          />
        </StateDisplay>
      )}

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
    </>
  );
}
