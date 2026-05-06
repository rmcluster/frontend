type StatusBadgeProps = {
  online: boolean;
};

export function StatusBadge({ online }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${online ? 'text-[var(--status-online)]' : 'text-[var(--text-muted)]'}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          online
            ? 'bg-[var(--status-online)] animate-[pulse-dot_2.4s_ease_infinite]'
            : 'bg-[var(--status-offline)]'
        }`}
      />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
