import { useEffect, useState } from 'react';
import { ServersTable } from '../components/dashboard/ServersTable';
import { AddDeviceModal } from '../components/devices/AddDeviceModal';
import { getJson } from '../lib/api';
import { apiRoutes } from '../lib/routes';
import type { DashboardServer } from '../types/ui';

export function DashboardPage() {
  const [servers, setServers] = useState<DashboardServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    let timer: number | undefined;

    const load = async () => {
      try {
        const payload = await getJson<{ servers: DashboardServer[] }>(
          apiRoutes.uiDashboard
        );
        setServers(payload.servers);
      } finally {
        setLoading(false);
      }
    };

    void load();
    timer = window.setInterval(load, 3000);

    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, []);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          Connect a device
        </button>
      </div>
      <ServersTable servers={servers} loading={loading} />
      <AddDeviceModal open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}
