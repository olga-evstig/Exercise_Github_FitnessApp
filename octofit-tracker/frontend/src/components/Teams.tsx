import { useCallback } from 'react';
import { getJson } from '../api/client.js';
import { useApiResource } from '../hooks/useApiResource.js';

type Team = { _id?: string; name: string; mascot: string; members: string[] };
type TeamsResponse = { teams: Team[] };

export default function Teams() {
  const loadTeams = useCallback(() => getJson<TeamsResponse>('/api/teams'), []);
  const { data, error, loading } = useApiResource(loadTeams);

  return (
    <section>
      <h2>Teams</h2>
      {loading && <p role="status">Loading teams…</p>}
      {error && <p role="alert">Unable to load teams: {error}</p>}
      {!loading && !error && data?.teams.length === 0 && <p>No teams yet.</p>}
      {!loading && !error && data && data.teams.length > 0 && (
        <ul className="list-group">
          {data.teams.map((team, index) => (
            <li className="list-group-item" key={team._id ?? `${team.name}-${index}`}>
              <strong>{team.name}</strong> — {team.mascot}
              {team.members.length > 0 && <span> (Members: {team.members.join(', ')})</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
