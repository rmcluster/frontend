import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '../ui/AlertDialog';

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
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{message}</AlertDialogDescription>
        <AlertDialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent) transition-colors cursor-pointer outline-none"
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
                  ? 'bg-(--danger) text-white hover:opacity-90'
                  : action.variant === 'ghost'
                    ? 'bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent) border-solid'
                    : 'bg-(--accent) text-white hover:opacity-90'
              }`}
            >
              {action.label}
            </button>
          ))}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
