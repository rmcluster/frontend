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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Connect a device</h2>
          <p>
            Scan with the rmcluster app to connect to{' '}
            {connectInfo && (
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em' }}>
                {connectInfo.host}:{connectInfo.port}
              </code>
            )}
          </p>
        </div>
        <div className="qr-container">
          {connectInfo ? (
            <>
              <div className="qr-box">
                <QRCode
                  value={connectInfo.connect_uri}
                  size={192}
                  bgColor="transparent"
                  fgColor={qrFg}
                  level="M"
                />
              </div>
              <div className="connect-uri">
                <code>{connectInfo.connect_uri}</code>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0 }}
                  onClick={() => void handleCopy()}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Single-use — expires in {connectInfo.token_expires_in_seconds}s.
              </p>
            </>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading…
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={() => void fetchConnectInfo()}
          >
            Regenerate
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
