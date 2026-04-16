import { useEffect, useState } from 'react';
import { AddDeviceModal } from '../components/devices/AddDeviceModal';
import { DeviceCard } from '../components/devices/DeviceCard';
import { SkeletonBlock } from '../components/SkeletonBlock';
import { PageHeader } from '../components/PageHeader';
import { getJson } from '../lib/api';
import type { Device, DashboardServer } from '../types/ui';

function serverToDevice(s: DashboardServer, idx: number): Device {
  return {
    id: `${s.ip}:${s.port}`,
    name: `device-${idx + 1}`,
    ip: s.ip,
    port: s.port,
    hardware_model: s.hardware_model,
    max_size: s.max_size,
    battery: s.battery != null ? s.battery / 100 : undefined,
    temperature: s.temperature,
    is_online: true,
    is_public: false,
    compute_hours: 0,
  };
}

export function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadDevices = async () => {
    try {
      const payload = await getJson<{ servers: DashboardServer[] }>('/api/ui/dashboard');
      setDevices(payload.servers.map(serverToDevice));
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDevices();
    const timer = window.setInterval(() => void loadDevices(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const handleTogglePublic = (id: string, value: boolean) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, is_public: value } : d))
    );
  };

  const handleDelete = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <>
      <PageHeader
        eyebrow="Cluster"
        title="Devices"
        subtitle="Manage your connected devices. Toggle public visibility or add new devices to the cluster."
        actions={
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add device
          </button>
        }
      />

      {loading ? (
        <div className="device-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="device-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <SkeletonBlock width="120px" height="1rem" />
                  <SkeletonBlock width="80px" height="0.75rem" className="mt-4" style={{ marginTop: '6px' } as React.CSSProperties} />
                </div>
                <SkeletonBlock width="60px" height="1.25rem" />
              </div>
              <SkeletonBlock width="140px" height="0.75rem" />
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[1, 2, 3, 4].map((k) => (
                  <div key={k}>
                    <SkeletonBlock width="60px" height="0.65rem" />
                    <SkeletonBlock width="40px" height="0.875rem" style={{ marginTop: '4px' } as React.CSSProperties} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
            </svg>
          </div>
          <h3>No devices connected</h3>
          <p>Add your first device to start contributing compute to the cluster.</p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            Connect a device
          </button>
        </div>
      ) : (
        <div className="device-grid">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onTogglePublic={handleTogglePublic}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddDeviceModal
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          void loadDevices();
        }}
      />
    </>
  );
}
