import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Zap, Activity, Gauge } from 'lucide-react';
import { getJson } from '../lib/api';
import { apiRoutes } from '../lib/routes';
import type { DashboardData } from '../types/ui';

type MetricChipProps = {
  icon: ReactNode;
  label: string;
  value?: number;
  decimals: number;
  unit: string;
};

function MetricChip({ icon, label, value, decimals, unit }: MetricChipProps) {
  const displayValue = typeof value === 'number' ? value.toFixed(decimals) : '—';

  return (
    <div
      className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
      title={label}
    >
      <span className="text-[var(--accent)]">{icon}</span>
      <span className="font-[var(--font-mono)] text-[var(--text-primary)]">
        {displayValue}
      </span>
      <span>{unit}</span>
    </div>
  );
}

export function MqttMetrics() {
  const [metrics, setMetrics] = useState<DashboardData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await getJson<DashboardData>(apiRoutes.uiDashboard);
        setMetrics(payload);
      } catch {
        setMetrics(null);
      }
    };

    void load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <MetricChip
        icon={<Zap size={14} />}
        label="Power"
        value={metrics?.power_watts}
        decimals={0}
        unit="W"
      />
      <MetricChip
        icon={<Gauge size={14} />}
        label="Voltage"
        value={metrics?.voltage}
        decimals={0}
        unit="V"
      />
      <MetricChip
        icon={<Activity size={14} />}
        label="Current"
        value={metrics?.current}
        decimals={3}
        unit="A"
      />
    </div>
  );
}
