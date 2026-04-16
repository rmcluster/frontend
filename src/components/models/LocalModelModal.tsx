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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add local GGUF model</h2>
          <p>Upload a .gguf file from your machine. The server will copy it into its model storage.</p>
        </div>
        <form onSubmit={onSave}>
          <div className="modal-body">
            <div className="field">
              <label htmlFor="lm-name">Name</label>
              <input
                id="lm-name"
                className="input"
                value={localName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="My Qwen 7B"
              />
            </div>
            <div className="field">
              <label htmlFor="lm-file">GGUF file</label>
              <input
                id="lm-file"
                className="input"
                type="file"
                accept=".gguf"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="field">
                <label htmlFor="lm-params">Parameters</label>
                <input
                  id="lm-params"
                  className="input"
                  value={localParameters}
                  onChange={(e) => onParametersChange(e.target.value)}
                  placeholder="7B"
                />
              </div>
              <div className="field">
                <label htmlFor="lm-quant">Quantization</label>
                <input
                  id="lm-quant"
                  className="input"
                  value={localQuantization}
                  onChange={(e) => onQuantizationChange(e.target.value)}
                  placeholder="Q4_K_M"
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
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
