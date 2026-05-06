import type { DashboardServer } from '../../types/ui';

type ServersTableProps = {
  servers: DashboardServer[];
  loading: boolean;
};

export function ServersTable({ servers, loading }: ServersTableProps) {
  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
      <h3 className="font-[var(--font-heading)] text-base font-semibold text-[var(--text-primary)] mb-4">
        Dashboard
      </h3>
      {loading ? (
        <p className="text-sm text-[var(--text-muted)] mb-4">Loading...</p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {['IP', 'Port', 'Hardware', 'Max Size', 'Battery', 'Temperature'].map((h) => (
                <th
                  key={h}
                  className="font-[var(--font-mono)] text-[0.72rem] uppercase tracking-[0.08em] text-[var(--text-muted)] px-4 py-3 border-b border-[var(--border)] text-left whitespace-nowrap"
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
                  className="px-4 py-4 text-[var(--text-primary)] text-sm border-b border-[var(--border-subtle)] align-middle"
                >
                  No clients connected.
                </td>
              </tr>
            ) : (
              servers.map((server) => (
                <tr
                  key={`${server.ip}:${server.port}`}
                  className="hover:[&>td]:bg-[var(--bg-elevated)]"
                >
                  {[server.ip, server.port, server.hardware_model || '—', server.max_size ?? '—', server.battery ?? '—', server.temperature ?? '—'].map((val, i) => (
                    <td
                      key={i}
                      className="px-4 py-4 border-b border-[var(--border-subtle)] align-middle text-sm text-[var(--text-primary)] transition-colors last:border-b-0"
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
    </section>
  );
}
