import type { ReactNode } from 'react';
import { Loader, AlertCircle } from 'lucide-react';

type Props = {
  loading?: boolean;
  error?: string | null;
  loadingRows?: number;
  children?: ReactNode;
  onRetry?: () => void;
};

export function StateDisplay({ loading, error, loadingRows = 5, children, onRetry }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-(--text-muted)">
        <Loader size={28} className="animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-(--text-muted)">
        <AlertCircle size={32} className="text-(--danger)" />
        <p className="text-sm text-(--danger)">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-(--accent) hover:underline cursor-pointer outline-none"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-9 rounded-md bg-(--bg-elevated) animate-pulse" />
      ))}
    </div>
  );
}
