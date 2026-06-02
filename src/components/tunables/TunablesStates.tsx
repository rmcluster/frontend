type ErrorStateProps = {
  message: string;
};

export function LoadingState() {
  return (
    <div className="py-16 text-center text-sm text-[var(--text-muted)]">
      Loading settings…
    </div>
  );
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-dim)] px-4 py-3 text-sm text-[var(--danger)]">
      {message}
    </div>
  );
}
