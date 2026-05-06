import type { FormEvent } from 'react';

type LocalModelModalProps = {
  open: boolean;
  localName: string;
  localParameters: string;
  localQuantization: string;
  uploading: boolean;
  canUseLocalFile: boolean;
  onClose: () => void;
  onSave: (event: FormEvent) => void;
  onNameChange: (value: string) => void;
  onParametersChange: (value: string) => void;
  onQuantizationChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
};

export function LocalModelModal({
  open, localName, localParameters, localQuantization,
  uploading, canUseLocalFile, onClose, onSave,
  onNameChange, onParametersChange, onQuantizationChange, onFileChange,
}: LocalModelModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 w-full max-w-md shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5">
          <h2 className="font-[var(--font-heading)] text-lg font-bold text-[var(--text-primary)]">
            Add local GGUF model
          </h2>
          <p className="mt-1 text-[var(--text-secondary)] text-sm">
            Upload a .gguf file from your machine. The server will copy it into its model storage.
          </p>
        </div>
        <form onSubmit={onSave}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 mb-4">
              <label htmlFor="lm-name" className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Name
              </label>
              <input
                id="lm-name"
                className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                value={localName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="My Qwen 7B"
              />
            </div>
            <div className="flex flex-col gap-1.5 mb-4">
              <label htmlFor="lm-file" className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                GGUF file
              </label>
              <input
                id="lm-file"
                className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                type="file"
                accept=".gguf"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 mb-4">
                <label htmlFor="lm-params" className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                  Parameters
                </label>
                <input
                  id="lm-params"
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                  value={localParameters}
                  onChange={(e) => onParametersChange(e.target.value)}
                  placeholder="7B"
                />
              </div>
              <div className="flex flex-col gap-1.5 mb-4">
                <label htmlFor="lm-quant" className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                  Quantization
                </label>
                <input
                  id="lm-quant"
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                  value={localQuantization}
                  onChange={(e) => onQuantizationChange(e.target.value)}
                  placeholder="Q4_K_M"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer outline-none"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canUseLocalFile || uploading}
            >
              {uploading ? 'Uploading…' : 'Save model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
