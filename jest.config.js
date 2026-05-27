/** @type {import('jest').Config} */
const config = {
  // No preset — configure ts-jest manually via transform so Jest finds it
  // in the /tmp/jestenv/node_modules location
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  // Resolve modules from both the project node_modules and the test runner node_modules
  modulePaths: [
    "<rootDir>/node_modules",
    "/tmp/jestenv/node_modules",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Mock Next.js server-only modules that can't run in Jest
    "^next/headers$": "<rootDir>/__mocks__/next/headers.js",
    "^next/server$": "<rootDir>/__mocks__/next/server.js",
    "^next/navigation$": "<rootDir>/__mocks__/next/navigation.js",
  },
  transform: {
    "^.+\\.tsx?$": [
      "/tmp/jestenv/node_modules/ts-jest/dist/index.js",
      {
        tsconfig: {
          paths: { "@/*": ["./src/*"] },
          module: "CommonJS",
          moduleResolution: "node",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          jsx: "react",
          strict: false,
        },
        diagnostics: { warnOnly: true },
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,
  modulePathIgnorePatterns: ["<rootDir>/.next"],
};

module.exports = config;
