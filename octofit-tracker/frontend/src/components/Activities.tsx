import { useCallback } from 'react';
import { getJson } from '../api/client.js';
import { useApiResource } from '../hooks/useApiResource.js';

type Activity = { _id?: string; type: string; minutes: number; points: number };
type ActivitiesResponse = { activities: Activity[] };

export default function Activities() {
  const loadActivities = useCallback(() => getJson<ActivitiesResponse>('/api/activities'), []);
  const { data, error, loading } = useApiResource(loadActivities);

  return (
    <section>
      <h2>Activities</h2>
      {loading && <p role="status">Loading activities…</p>}
      {error && <p role="alert">Unable to load activities: {error}</p>}
      {!loading && !error && data?.activities.length === 0 && <p>No activities yet.</p>}
      {!loading && !error && data && data.activities.length > 0 && (
        <ul className="list-group">
          {data.activities.map((activity, index) => (
            <li className="list-group-item" key={activity._id ?? `${activity.type}-${index}`}>
              {activity.type} — {activity.minutes} min, {activity.points} points
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
