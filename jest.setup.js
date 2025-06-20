// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/trading-contest-test';

// Increase timeout for tests
jest.setTimeout(30000);
