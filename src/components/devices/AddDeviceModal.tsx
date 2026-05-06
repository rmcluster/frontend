import { useCallback, useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useTheme } from '../../context/ThemeContext';
import type { ConnectInfo } from '../../types/ui';
import { apiRoutes } from '../../lib/routes';

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
      setConnectInfo(info);
    } catch {
      // silently keep null state
    }
  }, []);

  useEffect(() => {
    if (open) {
      void fetchConnectInfo();
    }
  }, [open, fetchConnectInfo]);

  if (!open) return null;

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
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 w-full max-w-md shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5">
          <h2 className="font-[var(--font-heading)] text-lg font-bold text-[var(--text-primary)]">
            Connect a device
          </h2>
          <p className="mt-1 text-[var(--text-secondary)] text-sm">
            Scan with the rmcluster app to connect to{' '}
            {connectInfo && (
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em' }}>
                {connectInfo.host}:{connectInfo.port}
              </code>
            )}
          </p>
        </div>

        <div className="flex flex-col items-center gap-5 w-full">
          {connectInfo ? (
            <>
              <div className="p-5 bg-[var(--bg-elevated)] rounded-[var(--radius-lg)] border border-[var(--border)]">
                <QRCode
                  value={connectInfo.connect_uri}
                  size={192}
                  bgColor="transparent"
                  fgColor={qrFg}
                  level="M"
                />
              </div>
              <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-3 w-full">
                <code className="flex-1 font-[var(--font-mono)] text-[0.72rem] text-[var(--text-secondary)] break-all min-w-0">
                  {connectInfo.connect_uri}
                </code>
                <button
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer outline-none flex-shrink-0"
                  onClick={() => void handleCopy()}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[0.8rem] text-[var(--text-muted)] text-center">
                Single-use — expires in {connectInfo.token_expires_in_seconds}s.
              </p>
            </>
          ) : (
            <div className="py-10 text-center text-[var(--text-muted)]">
              Loading…
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer outline-none"
            onClick={() => void fetchConnectInfo()}
          >
            Regenerate
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
