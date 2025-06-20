module.exports = {
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/__e2e__/**/*.js'],
  setupFilesAfterEnv: ['./jest.setup.js'],
};
