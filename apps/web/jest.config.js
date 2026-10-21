/** @type {import('jest').Config} */
module.exports = {
  reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions'] : ['default'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'features/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
  ],
  coverageDirectory: './coverage',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@devtrack/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },
};
