import * as A from '@radix-ui/react-alert-dialog';
import type { ReactNode } from 'react';

export const AlertDialog = A.Root;
export const AlertDialogTrigger = A.Trigger;
export const AlertDialogCancel = A.Cancel;
export const AlertDialogAction = A.Action;

function Overlay() {
  return (
    <A.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
  );
}

type ContentProps = {
  children: ReactNode;
  maxWidth?: string;
};

export function AlertDialogContent({ children, maxWidth = 'max-w-sm' }: ContentProps) {
  return (
    <A.Portal>
      <Overlay />
      <A.Content className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full ${maxWidth} p-4 focus:outline-none`}>
        <div className="bg-(--bg-surface) border border-(--border) rounded-xl p-6 shadow-(--shadow-lg)">
          {children}
        </div>
      </A.Content>
    </A.Portal>
  );
}

export function AlertDialogTitle({ children }: { children: ReactNode }) {
  return (
    <A.Title
      style={{ fontFamily: 'var(--font-heading)' }}
      className="text-lg font-bold text-(--text-primary) mb-1"
    >
      {children}
    </A.Title>
  );
}

export function AlertDialogDescription({ children }: { children: ReactNode }) {
  return (
    <A.Description className="text-(--text-secondary) text-sm mb-6">
      {children}
    </A.Description>
  );
}

export function AlertDialogFooter({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2">{children}</div>;
}
