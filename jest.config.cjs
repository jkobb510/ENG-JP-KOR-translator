module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['js', 'jsx', 'mjs'],
  transform: {
    '^.+\\.(m?js|jsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '\\.(css)$': '<rootDir>/tests/styleMock.js'
  }
};
