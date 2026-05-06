import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {eyebrow && (
            <div className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-1">
              {eyebrow}
            </div>
          )}
          <h1 className="font-[var(--font-heading)] text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 pt-1">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
