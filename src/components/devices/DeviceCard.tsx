import { StatusBadge } from '../StatusBadge';
import { Toggle } from './Toggle';
import type { Device } from '../../types/ui';

type DeviceCardProps = {
  device: Device;
  onTogglePublic: (id: string, value: boolean) => void;
  onDelete: (id: string) => void;
};

function batteryColor(pct: number): string {
  if (pct >= 50) return 'var(--battery-high)';
  if (pct >= 20) return 'var(--battery-mid)';
  return 'var(--battery-low)';
}

function tempColor(temp: number): string {
  if (temp >= 45) return 'var(--danger)';
  if (temp >= 35) return 'var(--warning)';
  return 'var(--success)';
}

export function DeviceCard({ device, onTogglePublic, onDelete }: DeviceCardProps) {
  const batteryPct = device.battery != null ? Math.round(device.battery * 100) : null;
  const tempC = device.temperature != null ? Math.round(device.temperature) : null;
  const maxSizeGB = device.max_size != null ? (device.max_size / 1e9).toFixed(1) : null;

  return (
    <div className="device-card">
      <div className="device-card-header">
        <div>
          <div className="device-name">{device.name}</div>
          <div className="device-hardware">{device.hardware_model || 'Unknown hardware'}</div>
        </div>
        <StatusBadge online={device.is_online} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {device.ip}:{device.port}
        </span>
      </div>

      <div className="device-stats">
        {batteryPct != null && (
          <div>
            <div className="device-stat-label">Battery</div>
            <div className="device-stat-value" style={{ color: batteryColor(batteryPct) }}>
              {batteryPct}%
            </div>
            <div className="battery-bar-wrap">
              <div
                className="battery-bar"
                style={{
                  width: `${batteryPct}%`,
                  background: batteryColor(batteryPct),
                }}
              />
            </div>
          </div>
        )}

        {tempC != null && (
          <div>
            <div className="device-stat-label">Temperature</div>
            <div className="device-stat-value" style={{ color: tempColor(tempC) }}>
              {tempC}°C
            </div>
          </div>
        )}

        {maxSizeGB && (
          <div>
            <div className="device-stat-label">Max model size</div>
            <div className="device-stat-value">{maxSizeGB} GB</div>
          </div>
        )}

        <div>
          <div className="device-stat-label">Compute donated</div>
          <div className="device-stat-value">
            {device.compute_hours > 0 ? `${device.compute_hours.toFixed(1)}h` : '—'}
          </div>
        </div>
      </div>

      <div className="device-card-footer">
        <Toggle
          checked={device.is_public}
          onChange={(v) => onTogglePublic(device.id, v)}
          label={device.is_public ? 'Public' : 'Private'}
        />
        <button
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(device.id)}
          title="Remove device"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
