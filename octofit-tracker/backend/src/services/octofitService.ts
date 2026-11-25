import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new ApiError('Request body must be an object', 400);
  return value;
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && Types.ObjectId.isValid(value);
}

export async function createActivity(input: unknown) {
  const body = requireRecord(input);
  const { userId, teamId, type, minutes } = body;

  if (!isObjectId(userId) || !isObjectId(teamId)) {
    throw new ApiError('Valid userId and teamId are required', 400);
  }
  if (typeof type !== 'string' || !type.trim()) {
    throw new ApiError('A non-empty activity type is required', 400);
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw new ApiError('Minutes must be a positive finite number', 400);
  }

  const [user, team] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!user || !team) throw new ApiError('The referenced user or team does not exist', 400);

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const body = requireRecord(input);
  const { name, mascot } = body;
  const members = body.members ?? [];

  if (typeof name !== 'string' || !name.trim()) {
    throw new ApiError('A non-empty team name is required', 400);
  }
  if (typeof mascot !== 'string' || !mascot.trim()) {
    throw new ApiError('A non-empty team mascot is required', 400);
  }
  if (!Array.isArray(members) || !members.every(isObjectId)) {
    throw new ApiError('Members must be an array of valid user IDs', 400);
  }

  const memberIds = [...new Set(members)];
  if (memberIds.length > 0) {
    const existingMembers = await User.countDocuments({ _id: { $in: memberIds } });
    if (existingMembers !== memberIds.length) {
      throw new ApiError('Every team member must reference an existing user', 400);
    }
  }

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));

  return teams
    .map(({ _id, name }) => ({
      teamName: name,
      totalPoints: pointsByTeam.get(_id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

const activityFocusByType: Record<string, string> = {
  cycle: 'endurance',
  run: 'endurance',
  walk: 'endurance',
  strength: 'strength',
};

export async function suggestWorkouts(userEmail: string) {
  const normalizedEmail = userEmail.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).lean();
  if (!user) throw new ApiError('No user found for that email address', 404);

  const [workouts, recentActivity] = await Promise.all([
    Workout.find().lean(),
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
  ]);
  const goal = user.fitnessGoal.toLocaleLowerCase();
  const recentType = recentActivity?.type.toLocaleLowerCase();
  const recentFocus = recentType
    ? activityFocusByType[recentType] ?? recentType
    : undefined;
  const recommended = workouts.find(({ focus }) => focus.toLocaleLowerCase() === goal)
    ?? (recentFocus ? workouts.find(({ focus }) => focus.toLocaleLowerCase() === recentFocus) : undefined);

  if (!recommended) return [];

  const reason = recommended.focus.toLocaleLowerCase() === goal
    ? `Recommended because it matches your ${user.fitnessGoal} fitness goal.`
    : `Recommended based on your recent ${recentActivity?.type} activity.`;
  return [
    { ...recommended, reason },
    ...workouts.filter(({ _id }) => !_id.equals(recommended._id)),
  ];
}
