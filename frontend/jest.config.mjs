export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/__tests__/*.{ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
    }],
  },
  globals: {
    'import.meta': {
      env: {
        VITE_API_BASE_URL: 'http://localhost:8000',
        VITE_ADMIN_EMAIL: 'admin@example.com'
      }
    }
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  coverageReporters: ['text', 'lcov', 'html'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|react-markdown))',
  ],
};
