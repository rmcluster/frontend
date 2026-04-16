import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useTheme } from '../../context/ThemeContext';

type AddDeviceModalProps = {
  open: boolean;
  onClose: () => void;
};

function generateToken(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function AddDeviceModal({ open, onClose }: AddDeviceModalProps) {
  const { theme } = useTheme();
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

  // Derive server address from wherever the browser is already talking to
  const serverUrl = window.location.hostname;
  const port = '4917';

  useEffect(() => {
    if (open) {
      setToken(generateToken());
      setCopied(false);
    }
  }, [open]);

  if (!open) return null;

  const qrUri = `rmcluster://connect?url=${encodeURIComponent(serverUrl)}&port=${port}&token=${token}`;
  const qrFg = theme === 'dark' ? '#e8ecf5' : '#0f1220';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrUri);
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
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em' }}>
              {serverUrl}:{port}
            </code>
          </p>
        </div>
        <div className="qr-container">
          <div className="qr-box">
            <QRCode
              value={qrUri}
              size={192}
              bgColor="transparent"
              fgColor={qrFg}
              level="M"
            />
          </div>
          <div className="connect-uri">
            <code>{qrUri}</code>
            <button
              className="btn btn-secondary btn-sm"
              style={{ flexShrink: 0 }}
              onClick={() => void handleCopy()}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Single-use — expires after one connection.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setToken(generateToken())}>
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
