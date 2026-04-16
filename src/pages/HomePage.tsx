import { Link } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: 'Cluster Inference',
    desc: 'Pool compute from multiple mobile devices. Run large models that no single device could handle alone.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    title: 'Model Management',
    desc: 'Search Hugging Face, add GGUF models, and manage your model library from one central dashboard.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Live Monitoring',
    desc: 'Real-time device health: battery, temperature, compute capacity. Know your cluster at a glance.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Community Compute',
    desc: 'Donate your device\'s spare compute. Track your contribution on the public leaderboard.',
  },
];

const mockLeaderboard = [
  { rank: 1, username: 'tanaka_m', devices: 4, hours: 1284 },
  { rank: 2, username: 'priya_s', devices: 3, hours: 998 },
  { rank: 3, username: 'wolf_dev', devices: 2, hours: 741 },
];

export function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <h1 className="hero-headline">
          rmcluster
        </h1>
        <p className="hero-sub">
          Pool compute from your phones and run open-source language models as a cluster.
        </p>
        <div className="hero-actions">
          <Link to="/devices" className="btn btn-primary btn-lg">
            Devices
          </Link>
          <Link to="/chat" className="btn btn-secondary btn-lg">
            Chat
          </Link>
        </div>
      </section>

      {/* Features */}
      <div className="feature-grid">
        {features.map((f) => (
          <div className="feature-card" key={f.title}>
            <div className="feature-icon">{f.icon}</div>
            <div className="feature-title">{f.title}</div>
            <p className="feature-desc">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Leaderboard teaser */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div className="eyebrow" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: '4px' }}>
              Community
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Top contributors
            </h2>
          </div>
          <Link to="/leaderboard" className="btn btn-ghost btn-sm">
            View all →
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>User</th>
                <th>Devices</th>
                <th>Hours donated</th>
              </tr>
            </thead>
            <tbody>
              {mockLeaderboard.map((entry) => (
                <tr key={entry.rank}>
                  <td>
                    <span className={`rank-badge rank-${entry.rank}`}>{entry.rank}</span>
                  </td>
                  <td className="td-name">{entry.username}</td>
                  <td>{entry.devices}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                    {entry.hours.toLocaleString()}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </>
  );
}
