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
      <div className="flex justify-end mb-4">
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer border-0 outline-none"
          onClick={() => setShowAdd(true)}
        >
          Connect a device
        </button>
      </div>
      <ServersTable servers={servers} loading={loading} />
      <AddDeviceModal open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}
