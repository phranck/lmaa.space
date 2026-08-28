// Global test setup: ensure env vars are available even after vi.resetModules()
// This runs before each test file in the worker process.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.NODE_ENV ??= "test";
process.env.PORT ??= "3000";
process.env.DASHBOARD_URL ??= "http://localhost:5174";
process.env.FRONTEND_URL ??= "http://localhost:4321";

// A test that reaches the network has a result that depends on somebody else,
// and it fails as a timeout on a runner rather than as a defect. Anything the
// suite genuinely needs to fetch is stubbed by the test itself through
// vi.stubGlobal, which replaces this and is restored to it afterwards.
globalThis.fetch = ((input: RequestInfo | URL) => {
  throw new Error(
    `A test tried to fetch ${String(input)}. Stub fetch with vi.stubGlobal, or mock the module that calls it.`,
  );
}) as typeof fetch;
