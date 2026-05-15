import { useState, type FormEvent } from 'react';

type NewFolderModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
};

export function NewFolderModal({ open, onClose, onCreate }: NewFolderModalProps) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      await onCreate(trimmed);
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  }

  function handleClose() {
    setName('');
    setError(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 w-full max-w-sm shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5">
          <h2 className="font-[var(--font-heading)] text-lg font-bold text-[var(--text-primary)]">
            New folder
          </h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5 mb-4">
            <label htmlFor="folder-name" className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
              Folder name
            </label>
            <input
              id="folder-name"
              autoFocus
              className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Untitled folder"
            />
            {error && <p className="text-xs text-[var(--danger)] mt-1">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer outline-none"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!name.trim() || creating}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
