// Global test setup: ensure env vars are available even after vi.resetModules()
// This runs before each test file in the worker process.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.NODE_ENV ??= "test";
