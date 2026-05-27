// Jest stub for next/headers
// Tests that import this module via jest.mock("next/headers", ...) will override it.
// This file is only needed so Jest can resolve the module during static analysis.
const cookies = jest.fn(() => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
}));

const headers = jest.fn(() => new Map());

module.exports = { cookies, headers };
