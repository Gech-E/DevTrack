/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
  reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions'] : ['default'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@devtrack/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};
