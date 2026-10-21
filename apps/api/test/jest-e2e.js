/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions'] : ['default'],
  testEnvironment: 'node',
  testTimeout: 30000,
  moduleNameMapper: {
    '^@devtrack/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
  },
};
