type IconProps = { size?: number; className?: string };

export function FolderIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
        fill="var(--accent)"
        opacity="0.9"
      />
    </svg>
  );
}

export function ImageIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
      />
      <circle cx="8.5" cy="8.5" r="1.5" fill="var(--text-secondary)" />
      <path
        d="M3 15l5-5 4 4 3-3 6 6"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VideoIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="2"
        y="5"
        width="15"
        height="14"
        rx="2"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
      />
      <path
        d="M17 9l5-3v12l-5-3V9z"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AudioIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M9 18V6l12-2v12"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="6"
        cy="18"
        r="3"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
      />
      <circle
        cx="18"
        cy="16"
        r="3"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function DocumentIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v6h6"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 13h8M8 17h5"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const IMAGE_EXTS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'avif',
  'bmp',
]);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']);

export function fileIconForEntry(
  isDirectory: boolean,
  name: string,
  contentType: string | null
) {
  if (isDirectory) return FolderIcon;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const mime = contentType?.split(';')[0].trim() ?? '';
  if (mime.startsWith('image/') || IMAGE_EXTS.has(ext)) return ImageIcon;
  if (mime.startsWith('video/') || VIDEO_EXTS.has(ext)) return VideoIcon;
  if (mime.startsWith('audio/') || AUDIO_EXTS.has(ext)) return AudioIcon;
  return DocumentIcon;
}
