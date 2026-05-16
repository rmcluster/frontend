import type { DashboardServer } from '../../types/ui';

type ServersTableProps = {
  servers: DashboardServer[];
  loading: boolean;
};

export function ServersTable({ servers, loading }: ServersTableProps) {
  return (
    <div className="overflow-x-auto">
      {loading ? (
        <p className="text-sm text-(--text-muted) mb-4">Loading...</p>
      ) : null}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {['IP', 'Port', 'Hardware', 'Max Size', 'Battery', 'Temperature'].map((h) => (
              <th
                key={h}
                className="font-(--font-mono) text-[0.72rem] uppercase tracking-[0.08em] text-(--text-muted) px-4 py-3 border-b border-(--border) text-left whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {servers.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-4 text-(--text-primary) text-sm border-b border-(--border-subtle) align-middle"
              >
                No clients connected.
              </td>
            </tr>
          ) : (
            servers.map((server) => (
              <tr
                key={server.id}
                className="hover:[&>td]:bg-(--bg-elevated)"
              >
                {[server.ip, server.port, server.hardware_model || '—', server.max_size ?? '—', server.battery ?? '—', server.temperature ?? '—'].map((val, i) => (
                  <td
                    key={i}
                    className="px-4 py-4 border-b border-(--border-subtle) align-middle text-sm text-(--text-primary) transition-colors last:border-b-0"
                  >
                    {val}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
