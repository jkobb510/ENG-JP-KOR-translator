module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['js', 'jsx', 'mjs'],
  transform: {
    '^.+\\.(m?js|jsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '\\.(css)$': '<rootDir>/tests/styleMock.js',
    '\\.(png|jpe?g|gif|svg)$': '<rootDir>/tests/fileMock.js'
  }
};
