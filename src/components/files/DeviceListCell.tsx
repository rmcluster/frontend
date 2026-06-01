import { useEffect, useMemo, useRef, useState } from 'react';
import type { FileDevice } from '../../types/files';

type DeviceListCellProps = {
  isDirectory: boolean;
  devices: FileDevice[];
};

export function DeviceListCell({ isDirectory, devices }: DeviceListCellProps) {
  const [open, setOpen] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);

  const displayText = useMemo(
    () => devices.map((device) => device.displayName).join(', '),
    [devices]
  );

  useEffect(() => {
    if (!textRef.current) {
      setOverflowing(false);
      return;
    }

    const checkOverflow = () => {
      const el = textRef.current;
      if (!el) return;
      setOverflowing(el.scrollWidth > el.clientWidth + 1);
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [displayText]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  if (isDirectory || devices.length === 0) {
    return <span>—</span>;
  }

  return (
    <div ref={rootRef} className="relative flex items-center justify-end gap-1">
      <span
        ref={textRef}
        className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
        title={!overflowing ? displayText : undefined}
      >
        {displayText}
      </span>
      {overflowing && (
        <>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="shrink-0 text-(--accent) hover:opacity-80 transition-opacity cursor-pointer outline-none"
            aria-expanded={open}
            aria-label="Show all devices"
          >
            ....
          </button>
          {open && (
            <div className="absolute right-0 top-[calc(100%+0.4rem)] z-20 min-w-52 max-w-72 rounded-lg border border-(--border) bg-(--bg-surface) px-3 py-2 text-left shadow-(--shadow-lg)">
              <p className="mb-2 text-[0.7rem] font-(--font-mono) uppercase tracking-[0.08em] text-(--text-muted)">
                Stored On
              </p>
              <ul className="space-y-1">
                {devices.map((device, index) => (
                  <li key={`${device.displayName}-${index}`} className="text-sm text-(--text-primary) break-words">
                    {device.displayName}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
