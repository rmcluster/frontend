import { X } from 'lucide-react';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';

type TunablesHeaderProps = {
  onClose: () => void;
};

export function TunablesHeader({ onClose }: TunablesHeaderProps) {
  return (
    <DialogHeader>
      <div className="flex items-start justify-between gap-4">
        <div>
          <DialogTitle>Tunables</DialogTitle>
          <DialogDescription>Runtime tuning controls.</DialogDescription>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-(--text-muted) transition-colors hover:bg-(--bg-elevated) hover:text-(--text-primary) cursor-pointer"
          aria-label="Close settings"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
    </DialogHeader>
  );
}
