import { Folder, Image, Video, Music, File } from 'lucide-react';
import { IMAGE_EXTS, VIDEO_EXTS, AUDIO_EXTS } from '../../types/files';

type FileEntryIconProps = {
  isDirectory: boolean;
  name: string;
  contentType: string | null;
  size?: number;
  className?: string;
};

export function FileEntryIcon({ isDirectory, name, contentType, size = 20, className }: FileEntryIconProps) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const mime = contentType?.split(';')[0].trim() ?? '';
  if (isDirectory) return <Folder size={size} className={`text-(--accent) ${className ?? ''}`} />;
  if (mime.startsWith('image/') || IMAGE_EXTS.has(ext)) return <Image size={size} className={`text-(--text-secondary) ${className ?? ''}`} />;
  if (mime.startsWith('video/') || VIDEO_EXTS.has(ext)) return <Video size={size} className={`text-(--text-secondary) ${className ?? ''}`} />;
  if (mime.startsWith('audio/') || AUDIO_EXTS.has(ext)) return <Music size={size} className={`text-(--text-secondary) ${className ?? ''}`} />;
  return <File size={size} className={`text-(--text-secondary) ${className ?? ''}`} />;
}
