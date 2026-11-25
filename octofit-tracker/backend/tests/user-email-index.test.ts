import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '../src/models/index.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await User.init();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('User email index', () => {
  it('normalizes email and rejects duplicate addresses', async () => {
    const user = await User.create({
      name: 'Mona',
      email: ' Mona@Example.com ',
      fitnessGoal: 'endurance',
    });

    expect(user.email).toBe('mona@example.com');
    await expect(User.create({
      name: 'Duplicate Mona',
      email: 'mona@example.com',
      fitnessGoal: 'strength',
    })).rejects.toMatchObject({ code: 11000 });
  });
});
