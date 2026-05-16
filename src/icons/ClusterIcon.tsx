import type { IconProps } from './iconProps';
export function ClusterIcon({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <circle cx="4" cy="4" r="2.2" fill="currentColor" />
      <circle cx="10" cy="4" r="2.2" fill="currentColor" opacity="0.5" />
      <circle cx="4" cy="10" r="2.2" fill="currentColor" opacity="0.5" />
      <circle cx="10" cy="10" r="2.2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
