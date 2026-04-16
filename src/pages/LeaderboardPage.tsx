import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SkeletonRow } from '../components/SkeletonBlock';
import { getJson } from '../lib/api';
import type { LeaderboardEntry } from '../types/ui';

const MOCK_DATA: LeaderboardEntry[] = [
  { rank: 1, username: 'tanaka_m', device_count: 4, compute_hours: 1284, tokens_generated: 28_400_000 },
  { rank: 2, username: 'priya_s', device_count: 3, compute_hours: 998, tokens_generated: 21_600_000 },
  { rank: 3, username: 'wolf_dev', device_count: 2, compute_hours: 741, tokens_generated: 16_200_000 },
  { rank: 4, username: 'kenji_r', device_count: 1, compute_hours: 530, tokens_generated: 11_900_000 },
  { rank: 5, username: 'abigail_c', device_count: 2, compute_hours: 412, tokens_generated: 9_300_000 },
  { rank: 6, username: 'ghost_node', device_count: 1, compute_hours: 289, tokens_generated: 6_400_000 },
  { rank: 7, username: 'ml_nerd_99', device_count: 1, compute_hours: 211, tokens_generated: 4_800_000 },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const payload = await getJson<{ entries: LeaderboardEntry[] }>('/api/ui/leaderboard');
        setEntries(payload.entries);
      } catch {
        setEntries(MOCK_DATA);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Compute Leaderboard"
        subtitle="Top contributors ranked by compute hours donated to the cluster."
      />

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>User</th>
                <th>Devices</th>
                <th>Hours donated</th>
                <th>Tokens generated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    No data yet. Connect a device and start contributing!
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.rank}>
                    <td>
                      <span className={`rank-badge rank-${entry.rank <= 3 ? entry.rank : 'n'}`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="td-name">{entry.username}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                      {entry.device_count}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                      {entry.compute_hours.toLocaleString()}h
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {fmt(entry.tokens_generated)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
