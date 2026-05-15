import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/Dialog';

type LocalModelModalProps = {
  open: boolean;
  localName: string;
  localParameters: string;
  localQuantization: string;
  uploading: boolean;
  canUseLocalFile: boolean;
  onClose: () => void;
  onSave: (event: { preventDefault(): void }) => void;
  onNameChange: (value: string) => void;
  onParametersChange: (value: string) => void;
  onQuantizationChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
};

export function LocalModelModal({
  open,
  localName,
  localParameters,
  localQuantization,
  uploading,
  canUseLocalFile,
  onClose,
  onSave,
  onNameChange,
  onParametersChange,
  onQuantizationChange,
  onFileChange,
}: LocalModelModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle>Add local GGUF model</DialogTitle>
          <DialogDescription>
            Upload a .gguf file from your machine. The server will copy it into
            its model storage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSave}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="lm-name"
                className="text-xs font-semibold text-(--text-muted) uppercase tracking-wide"
              >
                Name
              </label>
              <input
                id="lm-name"
                className="w-full px-3 py-2 text-sm bg-(--bg-input) border border-(--border) rounded-md text-(--text-primary) placeholder:text-(--text-muted) outline-none focus:border-(--accent) transition-colors"
                value={localName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="My Qwen 7B"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="lm-file"
                className="text-xs font-semibold text-(--text-muted) uppercase tracking-wide"
              >
                GGUF file
              </label>
              <input
                id="lm-file"
                className="w-full px-3 py-2 text-sm bg-(--bg-input) border border-(--border) rounded-md text-(--text-primary) outline-none focus:border-(--accent) transition-colors"
                type="file"
                accept=".gguf"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="lm-params"
                  className="text-xs font-semibold text-(--text-muted) uppercase tracking-wide"
                >
                  Parameters
                </label>
                <input
                  id="lm-params"
                  className="w-full px-3 py-2 text-sm bg-(--bg-input) border border-(--border) rounded-md text-(--text-primary) placeholder:text-(--text-muted) outline-none focus:border-(--accent) transition-colors"
                  value={localParameters}
                  onChange={(e) => onParametersChange(e.target.value)}
                  placeholder="7B"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="lm-quant"
                  className="text-xs font-semibold text-(--text-muted) uppercase tracking-wide"
                >
                  Quantization
                </label>
                <input
                  id="lm-quant"
                  className="w-full px-3 py-2 text-sm bg-(--bg-input) border border-(--border) rounded-md text-(--text-primary) placeholder:text-(--text-muted) outline-none focus:border-(--accent) transition-colors"
                  value={localQuantization}
                  onChange={(e) => onQuantizationChange(e.target.value)}
                  placeholder="Q4_K_M"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent) transition-colors cursor-pointer outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canUseLocalFile || uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--accent) text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading…' : 'Save model'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
