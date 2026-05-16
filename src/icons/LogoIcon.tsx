export function LogoIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="4" cy="4" r="2.5" fill="white" />
      <circle cx="10" cy="4" r="2.5" fill="rgba(255,255,255,0.55)" />
      <circle cx="4" cy="10" r="2.5" fill="rgba(255,255,255,0.55)" />
      <circle cx="10" cy="10" r="2.5" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}
