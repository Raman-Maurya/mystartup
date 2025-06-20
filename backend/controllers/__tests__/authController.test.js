const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');
const authController = require('../authController');

// Mock request and response objects
const mockRequest = (body = {}, user = null, params = {}) => ({
  body,
  user,
  params,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Auth Controller', () => {
  let mongoServer;

  // Set up MongoDB memory server before tests
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Clean up after tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clear database between tests
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const req = mockRequest({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });
      const res = mockResponse();

      await authController.register(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'User registered successfully',
        user: expect.objectContaining({
          username: 'testuser',
          email: 'test@example.com',
        }),
      }));

      // Verify user was created in the database
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user).toBeTruthy();
      expect(user.username).toBe('testuser');
      
      // Password should be hashed
      const passwordMatch = await bcrypt.compare('password123', user.password);
      expect(passwordMatch).toBe(true);
    });

    it('should return 400 if required fields are missing', async () => {
      const req = mockRequest({
        username: 'testuser',
        // Missing email and password
      });
      const res = mockResponse();

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('All fields are required'),
      }));
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
      });
    });

    it('should login successfully with correct credentials', async () => {
      const req = mockRequest({
        email: 'test@example.com',
        password: 'password123',
      });
      const res = mockResponse();
      
      // Mock JWT sign function
      jwt.sign = jest.fn().mockReturnValue('fake-token');

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        token: 'fake-token',
        user: expect.objectContaining({
          username: 'testuser',
          email: 'test@example.com',
        }),
      }));
    });

    it('should return 400 for invalid credentials', async () => {
      const req = mockRequest({
        email: 'test@example.com',
        password: 'wrongpassword',
      });
      const res = mockResponse();

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Invalid credentials',
      }));
    });
  });
});
