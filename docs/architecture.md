# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier: keep route-level pages responsible for rendering API data and loading, empty, and error states. Use the shared client for relative `/api` requests; keep business rules out of React components.
- Logic tier: keep HTTP parsing, validation, status codes, and response envelopes in Express routes, with capability behavior in services. Return deliberate 4xx responses for invalid input and missing resources; do not expose Mongoose cast errors as 500s.
- Data tier: use Mongoose schemas with required fields and ObjectId references. Give team members an empty-array default. Make seeding idempotent with upserts or equivalent targeted writes, preserving unrelated records.
- Activity tracking: accept `userId`, `teamId`, `type`, and positive finite `minutes`; validate both ID format and that the referenced records exist. Store references, compute points as minutes in the service, and set `occurredAt` on creation.
- Team management: require a non-empty name, preserve the submitted name and mascot, and default omitted members to an empty list. Validate supplied member references before saving.
- Leaderboard: aggregate activity points per team, include teams with no activity at zero points, sort by total points descending with team name ascending as a stable tie-breaker, and assign 1-based ranks.
- Workout suggestions: look up the user by email and return 404 if absent. Prefer a workout matching the user's fitness goal, fall back to their recent activity focus when needed, and include a reason that names the matching goal or activity.

## Test plan

- Data tier: `npm run test:data --prefix octofit-tracker/backend`. Failures indicate model constraints/defaults or idempotent, non-destructive seed behavior do not meet the data contract.
- API logic: `npm run test:api --prefix octofit-tracker/backend`. Failures indicate incorrect status codes or response shapes, invalid-reference handling, activity creation, leaderboard totals/ranks, or recommendation behavior.
- Presentation: `npm test --prefix octofit-tracker/frontend`. Failures indicate a route is not rendering fetched data or its loading, empty, error, accessibility, or request behavior is incorrect.
- Backend build: `npm run build --prefix octofit-tracker/backend`. Failures indicate TypeScript or backend build errors.
- Frontend build: `npm run build --prefix octofit-tracker/frontend`. Failures indicate TypeScript or Vite build errors.

Baseline before implementation (2026-11-25): the data suite had 4 failures and 1 pass; the failures were missing required User, Team, Activity, and Workout fields. The API suite had 4 failures: invalid activity/team input returned 501 instead of 400, the leaderboard was empty, and a workout suggestion lacked its expected reason. The frontend suite had 15 failures involving data rendering, the workout request, and loading, empty, and error states. The build commands have not yet been run.
