import { downloadUrl } from '../../lib/webdav';
import { MoreVertical } from 'lucide-react';
import type { DavEntry } from '../../types/files';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/DropdownMenu';

export type EntryActionsProps = {
  entry: DavEntry;
  onRename: () => void;
  onDelete: () => void;
  onView: () => void;
  onMoveTo: () => void;
};

export function EntryActions({ entry, onRename, onDelete, onView, onMoveTo }: EntryActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-1.5 rounded hover:bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer outline-none"
          aria-label="Actions"
        >
          <MoreVertical size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {!entry.isDirectory && (
          <DropdownMenuItem onSelect={onView}>Open</DropdownMenuItem>
        )}
        {!entry.isDirectory && (
          <DropdownMenuItem asChild>
            <a href={downloadUrl(entry.path)} download={entry.name}>
              Download
            </a>
          </DropdownMenuItem>
        )}
        {!entry.isDirectory && <DropdownMenuSeparator />}
        <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem onSelect={onMoveTo}>Move to…</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger" onSelect={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
