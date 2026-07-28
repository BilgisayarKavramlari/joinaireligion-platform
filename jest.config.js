/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Mock Next.js server-only modules that can't run in Jest
    "^next/headers$": "<rootDir>/__mocks__/next/headers.js",
    "^next/server$": "<rootDir>/__mocks__/next/server.js",
    "^next/navigation$": "<rootDir>/__mocks__/next/navigation.js",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          paths: { "@/*": ["./src/*"] },
          module: "CommonJS",
          moduleResolution: "node",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          jsx: "react",
          strict: false,
          baseUrl: ".",
        },
        diagnostics: { warnOnly: true },
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,
  modulePathIgnorePatterns: ["<rootDir>/.next"],
};

module.exports = config;
