const createJestConfig = require('next/jest').default;

const nextJestConfig = createJestConfig({
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  moduleNameMapper: {
    '^twilio$': '<rootDir>/__mocks__/twilio.js',
    '^@/(.*)$': '<rootDir>/$1',
    '^@/server/(.*)$': '<rootDir>/server/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/services/(.*)$': '<rootDir>/services/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/config/(.*)$': '<rootDir>/config/$1',
    '^@/data/(.*)$': '<rootDir>/data/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/styles/(.*)$': '<rootDir>/styles/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
  },
  collectCoverageFrom: [
    'components/**/*.{js,jsx}',
    'utils/**/*.js',
    'lib/**/*.js',
    'services/**/*.js',
    'pages/api/**/*.js',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = nextJestConfig(customJestConfig);
