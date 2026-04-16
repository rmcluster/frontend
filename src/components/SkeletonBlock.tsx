type SkeletonBlockProps = {
  width?: string;
  height?: string;
  className?: string;
};

export function SkeletonBlock({ width = '100%', height = '1rem', className }: SkeletonBlockProps) {
  return (
    <div
      className={`skeleton${className ? ` ${className}` : ''}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <SkeletonBlock height="0.875rem" width={i === 0 ? '140px' : '80px'} />
        </td>
      ))}
    </tr>
  );
}
