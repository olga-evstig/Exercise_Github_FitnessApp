import { useCallback } from 'react';
import { getJson } from '../api/client.js';
import { useApiResource } from '../hooks/useApiResource.js';

type WorkoutSuggestion = {
  _id?: string;
  title: string;
  focus: string;
  minutes: number;
  difficulty: string;
  reason?: string;
};
type WorkoutResponse = { suggestions: WorkoutSuggestion[] };
const userEmail = 'mona@example.com';

export default function Workouts() {
  const path = `/api/workouts/suggestions/${encodeURIComponent(userEmail)}`;
  const loadWorkouts = useCallback(() => getJson<WorkoutResponse>(path), [path]);
  const { data, error, loading } = useApiResource(loadWorkouts);

  return (
    <section>
      <h2>Workout suggestions</h2>
      {loading && <p role="status">Loading workout suggestions…</p>}
      {error && <p role="alert">Unable to load workout suggestions: {error}</p>}
      {!loading && !error && data?.suggestions.length === 0 && <p>No workout suggestions available.</p>}
      {!loading && !error && data && data.suggestions.length > 0 && (
        <ul className="list-group">
          {data.suggestions.map((workout, index) => (
            <li className="list-group-item" key={workout._id ?? `${workout.title}-${index}`}>
              <strong>{workout.title}</strong> — {workout.focus}, {workout.minutes} min ({workout.difficulty})
              {workout.reason && <p className="mb-0">{workout.reason}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
