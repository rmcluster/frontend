import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/Dialog';

type NewFileModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
};

export function NewFileModal({ open, onClose, onCreate }: NewFileModalProps) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(o: boolean) {
    if (!o) {
      setName('');
      setError(null);
      onClose();
    }
  }

  async function handleSubmit(e: { preventDefault(): void }) {
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
      setError(err instanceof Error ? err.message : 'Failed to create file');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New file</DialogTitle>
          <DialogDescription>
            Creates an empty file you can edit right away.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5 mb-4">
            <label
              htmlFor="file-name"
              className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
            >
              File name
            </label>
            <input
              id="file-name"
              autoFocus
              className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="notes.md"
            />
            {error && (
              <p className="text-xs text-[var(--danger)] mt-1">{error}</p>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent) transition-colors cursor-pointer outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || creating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--accent) text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating…' : 'Create & open'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
