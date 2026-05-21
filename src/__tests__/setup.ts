// Vitest setup file for global mocks and configurations.
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
