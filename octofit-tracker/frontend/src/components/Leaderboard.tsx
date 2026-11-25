import { useCallback } from 'react';
import { getJson } from '../api/client.js';
import { useApiResource } from '../hooks/useApiResource.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };
type LeaderboardResponse = { leaderboard: LeaderboardEntry[] };

export default function Leaderboard() {
  const loadLeaderboard = useCallback(() => getJson<LeaderboardResponse>('/api/leaderboard'), []);
  const { data, error, loading } = useApiResource(loadLeaderboard);

  return (
    <section>
      <h2>Leaderboard</h2>
      {loading && <p role="status">Loading leaderboard…</p>}
      {error && <p role="alert">Unable to load leaderboard: {error}</p>}
      {!loading && !error && data?.leaderboard.length === 0 && <p>No leaderboard scores yet.</p>}
      {!loading && !error && data && data.leaderboard.length > 0 && (
        <ol className="list-group list-group-numbered">
          {data.leaderboard.map((entry) => (
            <li className="list-group-item" key={entry.rank}>
              {entry.teamName} — {entry.totalPoints} points
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
