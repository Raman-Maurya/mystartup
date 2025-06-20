/**
 * Mock data utilities for testing and development
 */

const jwt = require('jsonwebtoken');

// Define a consistent JWT_SECRET if environment variable is not set
const JWT_SECRET = process.env.JWT_SECRET || 'tradingtournament2024secret';

// Generate a valid test token with a dummy user ID
const generateTestToken = () => {
  return jwt.sign(
    { id: '6451a2e3c7b53e0012345678' }, // Dummy MongoDB ObjectID format
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

module.exports = {
  generateTestToken
}; 