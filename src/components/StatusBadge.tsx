type StatusBadgeProps = {
  online: boolean;
};

export function StatusBadge({ online }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${online ? 'online' : 'offline'}`}>
      <span className="status-dot" />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
