import * as D from '@radix-ui/react-dropdown-menu';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export const DropdownMenu = D.Root;
export const DropdownMenuTrigger = D.Trigger;
export const DropdownMenuSeparator = D.Separator;

type ContentProps = ComponentPropsWithoutRef<typeof D.Content> & {
  children: ReactNode;
};

export function DropdownMenuContent({
  children,
  align = 'end',
  sideOffset = 4,
  className = '',
  ...props
}: ContentProps) {
  return (
    <D.Portal>
      <D.Content
        align={align}
        sideOffset={sideOffset}
        className={`z-50 min-w-[10rem] bg-[var(--bg-surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-lg)] py-1 text-sm focus:outline-none ${className}`}
        {...props}
      >
        {children}
      </D.Content>
    </D.Portal>
  );
}

type ItemProps = ComponentPropsWithoutRef<typeof D.Item> & {
  children: ReactNode;
  variant?: 'default' | 'danger';
};

export function DropdownMenuItem({
  children,
  variant = 'default',
  className = '',
  ...props
}: ItemProps) {
  const color =
    variant === 'danger'
      ? 'text-[var(--danger)] focus:text-[var(--danger)]'
      : 'text-[var(--text-primary)]';
  return (
    <D.Item
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none outline-none focus:bg-[var(--bg-elevated)] data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed ${color} ${className}`}
      {...props}
    >
      {children}
    </D.Item>
  );
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
      {children}
    </div>
  );
}
