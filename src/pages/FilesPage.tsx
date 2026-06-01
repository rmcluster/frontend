import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listDir,
  createFolder,
  createFile,
  moveEntry,
  downloadUrl,
} from '../lib/webdav';
import type { DavEntry, ViewMode } from '../types/files';
import { extOf, classify } from '../types/files';
import { PageHeader } from '../components/PageHeader';
import { FileBreadcrumb } from '../components/files/FileBreadcrumb';
import { FileList } from '../components/files/FileList';
import { FileViewer } from '../components/files/FileViewer';
import type { FileViewerHandle } from '../components/files/FileViewer';
import { ConfirmModal } from '../components/files/ConfirmModal';
import { NewFolderModal } from '../components/files/NewFolderModal';
import { NewFileModal } from '../components/files/NewFileModal';
import { UploadButton } from '../components/files/UploadButton';
import { StateDisplay, SkeletonRows } from '../components/StateDisplay';
import { getJson } from '../lib/api';
import { apiRoutes, DAV_BASE } from '../lib/routes';
import type { ConnectInfo } from '../types/ui';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '../components/ui/AlertDialog';
import { ChevronLeft, FilePlus, Plus, List, LayoutGrid, Network } from 'lucide-react';

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

  // Inline rename state (lives here so FileBreadcrumb can render it)
  const [renamingFile, setRenamingFile] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameSubmitting, setRenameSubmitting] = useState(false);
  const [extWarnNewName, setExtWarnNewName] = useState<string | null>(null);

  const viewerRef = useRef<FileViewerHandle>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [davUrl, setDavUrl] = useState<string>('');
  const [davModalOpen, setDavModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void getJson<ConnectInfo>(apiRoutes.uiConnectInfo)
      .then((info) => setDavUrl(`http://${info.host}:${info.port}${DAV_BASE}`))
      .catch(() => setDavUrl(`${window.location.origin}${DAV_BASE}`));
  }, []);

  function handleCopyDavUrl() {
    void navigator.clipboard.writeText(davUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleSave() {
    if (!viewerRef.current) return;
    setSaving(true);
    try {
      await viewerRef.current.save();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // error is displayed inside FileViewer via its save-error modal
    } finally {
      setSaving(false);
    }
  }

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

  // Clear viewer + rename state when file param changes or is removed
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!filePath) setViewingEntry(null);
     
    setRenamingFile(false);
     
    setRenameValue('');
     
    setExtWarnNewName(null);
  }, [filePath]);

  // Restore viewed file from URL once entries are available
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
  const viewingIsStructured =
    viewingExt === 'csv' || viewingExt === 'json' || viewingExt === 'md' ||
    viewingExt === 'html' || viewingExt === 'htm' || viewingExt === 'xml';
  const viewingKind = viewingEntry
    ? classify(viewingEntry.name, viewingEntry.contentType)
    : null;
  const viewingPreview =
    fileMode != null ? fileMode === 'preview' : viewingIsStructured;

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
    setSearchParams(buildParams({ file: entry.path, mode: null }), {
      replace: false,
    });
  }

  function closeViewer() {
    setViewingEntry(null);
    setSearchParams(buildParams({ file: null, mode: null }), {
      replace: false,
    });
  }

  function handleFileModeChange(mode: 'preview' | 'edit') {
    setSearchParams(buildParams({ mode }), { replace: true });
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

  // ── Rename ────────────────────────────────────────────────────────────────

  function startRename() {
    if (!viewingEntry) return;
    setRenameValue(viewingEntry.name);
    setRenamingFile(true);
    setExtWarnNewName(null);
  }

  function cancelRename() {
    setRenamingFile(false);
    setExtWarnNewName(null);
  }

  async function doRename(name: string) {
    if (!viewingEntry) return;
    setRenameSubmitting(true);
    const parentPath = viewingEntry.path.replace(/\/?[^/]+\/?$/, '/');
    const toPath = `${parentPath}${name}`;
    await moveEntry(viewingEntry.path, toPath);
    const updated = { ...viewingEntry, name, path: toPath };
    setViewingEntry(updated);
    setSearchParams(buildParams({ file: toPath }), { replace: true });
    setRenamingFile(false);
    setRenameSubmitting(false);
    setExtWarnNewName(null);
  }

  async function commitRename() {
    if (!viewingEntry || renameSubmitting) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === viewingEntry.name) {
      cancelRename();
      return;
    }

    const oldExt = extOf(viewingEntry.name);
    const newExt = extOf(trimmed);
    if (oldExt && newExt && oldExt !== newExt) {
      setExtWarnNewName(trimmed);
      return;
    }

    await doRename(trimmed);
  }

  // ── Create ────────────────────────────────────────────────────────────────

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
      devices: [],
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
                <>
                  <button
                    onClick={() => handleFileModeChange('preview')}
                    className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer outline-none ${viewingPreview ? 'bg-(--accent) text-white' : 'bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent)'}`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleFileModeChange('edit')}
                    className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer outline-none ${!viewingPreview ? 'bg-(--accent) text-white' : 'bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent)'}`}
                  >
                    Edit
                  </button>
                </>
              )}

              {viewingKind === 'text' && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--accent) text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none disabled:opacity-70 disabled:cursor-not-allowed ${viewingPreview ? 'invisible pointer-events-none' : ''}`}
                >
                  {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
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
                onClick={() => setDavModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent) transition-colors cursor-pointer outline-none"
              >
                <Network size={14} />
                Connect
              </button>
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
          renamingFile={renamingFile}
          renameValue={renameValue}
          renameSubmitting={renameSubmitting}
          onRenameValueChange={setRenameValue}
          onRenameCommit={commitRename}
          onRenameCancel={cancelRename}
          onRenameStart={startRename}
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
            preview={viewingPreview}
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

      <ConfirmModal
        open={extWarnNewName !== null}
        title="Change file type"
        message={
          extWarnNewName && viewingEntry
            ? `Change extension from .${extOf(viewingEntry.name)} to .${extOf(extWarnNewName)}?`
            : ''
        }
        onClose={() => setExtWarnNewName(null)}
        actions={[
          {
            label: 'Change extension',
            variant: 'primary',
            onClick: () => {
              if (extWarnNewName) doRename(extWarnNewName);
            },
          },
        ]}
      />

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

      <AlertDialog open={davModalOpen} onOpenChange={(o) => !o && setDavModalOpen(false)}>
        <AlertDialogContent maxWidth="max-w-lg">
          <AlertDialogTitle>Connect via WebDAV</AlertDialogTitle>
          <AlertDialogDescription>
            Mount this address in Finder, Windows Explorer, or any WebDAV client to access your files directly from your filesystem.
          </AlertDialogDescription>
          <div className="mb-6 flex items-center gap-2">
            <code className="flex-1 px-3 py-2 text-sm font-mono rounded-md bg-(--bg-elevated) border border-(--border) text-(--text-primary) truncate">
              {davUrl}
            </code>
            <button
              onClick={handleCopyDavUrl}
              className="shrink-0 inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-(--accent) text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <AlertDialogFooter>
            <button
              type="button"
              onClick={() => setDavModalOpen(false)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent) transition-colors cursor-pointer outline-none"
            >
              Close
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
