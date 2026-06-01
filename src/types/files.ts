export interface FileDevice {
  displayName: string;
}

export interface DavEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number | null;
  lastModified: string | null;
  contentType: string | null;
  devices: FileDevice[];
}

export type FileKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'unknown';

export type ViewMode = 'list' | 'grid';

export const IMAGE_EXTS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'avif',
  'bmp',
]);
export const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v']);
export const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']);
export const TEXT_EXTS = new Set([
  'txt',
  'md',
  'json',
  'csv',
  'js',
  'ts',
  'tsx',
  'jsx',
  'py',
  'go',
  'rs',
  'yaml',
  'yml',
  'toml',
  'xml',
  'html',
  'css',
  'sh',
  'bash',
  'env',
  'gitignore',
  'log',
]);

export function extOf(name: string): string {
  const parts = name.split('.');
  if (parts.length < 2 || parts[0] === '') return '';
  return parts.pop()?.toLowerCase() ?? '';
}

export function classify(name: string, contentType: string | null): FileKind {
  const ext = extOf(name);
  const mime = contentType?.split(';')[0].trim() ?? '';
  if (mime.startsWith('image/') || IMAGE_EXTS.has(ext)) return 'image';
  if (mime.startsWith('video/') || VIDEO_EXTS.has(ext)) return 'video';
  if (mime.startsWith('audio/') || AUDIO_EXTS.has(ext)) return 'audio';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime.startsWith('text/') || TEXT_EXTS.has(ext)) return 'text';
  // Known extension we can't render → show download prompt, not garbled binary
  if (ext) return 'unknown';
  // No extension → best-effort plain text
  return 'text';
}
