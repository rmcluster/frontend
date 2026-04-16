import { useEffect, useState } from 'react';
import { ServersTable } from '../components/dashboard/ServersTable';
import { getJson } from '../lib/api';
import type { DashboardServer } from '../types/ui';

export function DashboardPage() {
  const [servers, setServers] = useState<DashboardServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timer: number | undefined;

    const load = async () => {
      try {
        const payload = await getJson<{ servers: DashboardServer[] }>(
          '/api/ui/dashboard'
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

  return <ServersTable servers={servers} loading={loading} />;
}
