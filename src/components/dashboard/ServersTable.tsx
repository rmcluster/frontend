import type { DashboardServer } from '../../types/ui';

type ServersTableProps = {
  servers: DashboardServer[];
  loading: boolean;
};

export function ServersTable({ servers, loading }: ServersTableProps) {
  return (
    <section className="card">
      <h3>Dashboard</h3>
      {loading ? <div className="notice">Loading...</div> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>IP</th>
              <th>Port</th>
              <th>Hardware</th>
              <th>Max Size</th>
              <th>Battery</th>
              <th>Temperature</th>
            </tr>
          </thead>
          <tbody>
            {servers.length === 0 ? (
              <tr>
                <td colSpan={6}>No clients connected.</td>
              </tr>
            ) : (
              servers.map((server) => (
                <tr key={`${server.ip}:${server.port}`}>
                  <td>{server.ip}</td>
                  <td>{server.port}</td>
                  <td>{server.hardware_model || '—'}</td>
                  <td>{server.max_size ?? '—'}</td>
                  <td>{server.battery ?? '—'}</td>
                  <td>{server.temperature ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
