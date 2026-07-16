// Test stub for `virtual:pwa-register`, the build-time virtual module that
// vite-plugin-pwa generates. It does not exist under vitest, so tests alias this
// file in its place (see vite.config.ts `test.alias`).
import { vi } from 'vitest';

export const registerSW = vi.fn(() => vi.fn());
