import { useCallback, useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useTheme } from '../../context/ThemeContext';
import type { ConnectInfo } from '../../types/ui';
import { apiRoutes } from '../../lib/routes';
import { normalizeConnectInfo } from '../../lib/connectInfo';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/Dialog';

type AddDeviceModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AddDeviceModal({ open, onClose }: AddDeviceModalProps) {
  const { theme } = useTheme();
  const [connectInfo, setConnectInfo] = useState<ConnectInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchConnectInfo = useCallback(async () => {
    setConnectInfo(null);
    setCopied(false);
    try {
      const res = await fetch(apiRoutes.uiConnectInfo, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return;
      const info = (await res.json()) as ConnectInfo;
      setConnectInfo(await normalizeConnectInfo(info));
    } catch {
      // silently keep null state
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) void fetchConnectInfo();
  }, [open, fetchConnectInfo]);

  const qrFg = theme === 'dark' ? '#e8ecf5' : '#0f1220';

  const handleCopy = async () => {
    if (!connectInfo) return;
    try {
      await navigator.clipboard.writeText(connectInfo.connect_uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect a device</DialogTitle>
          <DialogDescription>
            Scan with the rmcluster app to connect to{' '}
            {connectInfo && (
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em' }}>
                {connectInfo.host}:{connectInfo.port}
              </code>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 w-full">
          {connectInfo ? (
            <>
              <div className="p-5 bg-(--bg-elevated) rounded-lg border border-(--border)">
                <QRCode
                  value={connectInfo.connect_uri}
                  size={192}
                  bgColor="transparent"
                  fgColor={qrFg}
                  level="M"
                />
              </div>
              <div className="flex items-center gap-2 bg-(--bg-elevated) border border-(--border) rounded-md px-4 py-3 w-full">
                <code className="flex-1 font-(--font-mono) text-[0.72rem] text-(--text-secondary) break-all min-w-0">
                  {connectInfo.connect_uri}
                </code>
                <button
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent) transition-colors cursor-pointer outline-none shrink-0"
                  onClick={() => void handleCopy()}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[0.8rem] text-(--text-muted) text-center">
                Single-use — expires in {connectInfo.token_expires_in_seconds}s.
              </p>
            </>
          ) : (
            <div className="py-10 text-center text-(--text-muted)">
              Loading…
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--bg-elevated) text-(--text-primary) border border-(--border) hover:border-(--accent) transition-colors cursor-pointer outline-none"
            onClick={() => void fetchConnectInfo()}
          >
            Regenerate
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-(--accent) text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none"
            onClick={onClose}
          >
            Done
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
