/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^server-only$': '<rootDir>/tests/__mocks__/server-only.ts',
  },
  setupFiles: ['<rootDir>/tests/setupEnv.ts'],
  transform: {
    // @noble/* (dependencia de fabric-gateway) se publica solo como ESM: se transforma a CommonJS para Jest.
    '^.+\.(ts|js)$': [
      'ts-jest',
      { tsconfig: { module: 'commonjs', moduleResolution: 'node', esModuleInterop: true, isolatedModules: true, allowJs: true } },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!@noble/)'],
  testTimeout: 60000,
};
