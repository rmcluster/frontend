import { createPortal } from 'react-dom';

export type ConfirmModalAction = {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
};

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  actions: ConfirmModalAction[];
  onClose: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  actions,
  onClose,
}: ConfirmModalProps) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 w-full max-w-sm shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-[var(--font-heading)] text-lg font-bold text-[var(--text-primary)] mb-1">
          {title}
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer outline-none"
          >
            Cancel
          </button>
          {actions.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer outline-none border-0 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ${
                action.variant === 'danger'
                  ? 'bg-[var(--danger,#ef4444)] text-white hover:opacity-90'
                  : action.variant === 'ghost'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] border-solid'
                    : 'bg-[var(--accent)] text-white hover:opacity-90'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
