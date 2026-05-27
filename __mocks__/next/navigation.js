// Jest stub for next/navigation
const useRouter = jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }));
const useSearchParams = jest.fn(() => ({ get: jest.fn() }));
const usePathname = jest.fn(() => "/");
module.exports = { useRouter, useSearchParams, usePathname };
