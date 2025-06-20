const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Contest = require('../../models/Contest');
const contestRoutes = require('../contestRoutes');
const authMiddleware = require('../../middleware/auth');

// Mock the auth middleware
jest.mock('../../middleware/auth', () => ({
  auth: jest.fn((req, res, next) => next()),
  admin: jest.fn((req, res, next) => next()),
}));

describe('Contest Routes Integration Tests', () => {
  let app;
  let mongoServer;
  let testUser;
  let testContest;

  // Setup express app and mongodb
  beforeAll(async () => {
    // Create a MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/contests', contestRoutes);

    // Create a test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
    });

    // Create a test contest
    testContest = await Contest.create({
      name: 'Test Contest',
      description: 'This is a test contest',
      entryFee: 100,
      maxParticipants: 10,
      startDate: new Date(Date.now() + 86400000), // tomorrow
      endDate: new Date(Date.now() + 172800000), // day after tomorrow
      prizePool: 1000,
      contestType: 'PAID',
      category: 'stocks',
    });
  });

  // Cleanup
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Set up auth middleware to inject test user into request
    authMiddleware.auth.mockImplementation((req, res, next) => {
      req.user = { id: testUser._id };
      next();
    });
  });

  describe('GET /api/contests', () => {
    it('should return all contests', async () => {
      const response = await request(app).get('/api/contests');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.contests).toBeInstanceOf(Array);
      expect(response.body.contests.length).toBeGreaterThan(0);
      expect(response.body.contests[0].name).toBe('Test Contest');
    });
  });

  describe('GET /api/contests/:id', () => {
    it('should return a specific contest', async () => {
      const response = await request(app).get(`/api/contests/${testContest._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.contest).toMatchObject({
        name: 'Test Contest',
        description: 'This is a test contest',
        entryFee: 100,
      });
    });

    it('should return 404 for non-existent contest', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/api/contests/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/contests/:id/join', () => {
    it('should allow a user to join a contest', async () => {
      const response = await request(app)
        .post(`/api/contests/${testContest._id}/join`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('joined the contest');
    });
  });
});
