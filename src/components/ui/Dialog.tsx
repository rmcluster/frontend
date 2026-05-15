import * as D from '@radix-ui/react-dialog';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

function Overlay() {
  return (
    <D.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
  );
}

type ContentProps = ComponentPropsWithoutRef<typeof D.Content> & {
  maxWidth?: string;
  children: ReactNode;
};

export function DialogContent({
  children,
  maxWidth = 'max-w-sm',
  className = '',
  ...props
}: ContentProps) {
  return (
    <D.Portal>
      <Overlay />
      <D.Content
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full ${maxWidth} p-4 focus:outline-none ${className}`}
        {...props}
      >
        <div className="bg-(--bg-surface) border border-(--border) rounded-xl p-6 shadow-(--shadow-lg)">
          {children}
        </div>
      </D.Content>
    </D.Portal>
  );
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-5">{children}</div>;
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return (
    <D.Title
      style={{ fontFamily: 'var(--font-heading)' }}
      className="text-lg font-bold text-(--text-primary)"
    >
      {children}
    </D.Title>
  );
}

export function DialogDescription({ children }: { children: ReactNode }) {
  return (
    <D.Description className="mt-1 text-(--text-secondary) text-sm">
      {children}
    </D.Description>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2 mt-6">{children}</div>;
}
