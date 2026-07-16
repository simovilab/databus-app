import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const isNativePlatform = vi.fn(() => false);

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
  },
}));

import { registerServiceWorker } from '@/services/pwa';
import { registerSW } from 'virtual:pwa-register';

describe('registerServiceWorker', () => {
  beforeEach(() => {
    vi.mocked(registerSW).mockClear();
    isNativePlatform.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the service worker on web', async () => {
    const registered = await registerServiceWorker();

    expect(registered).toBe(true);
    expect(registerSW).toHaveBeenCalledTimes(1);
  });

  it('does NOT register on native', async () => {
    // capacitor.config.ts uses webDir: 'dist', so this same build is packaged
    // into the Capacitor webview. A SW there hijacks the local app assets and
    // strands the native app on a precache a store update cannot dislodge.
    isNativePlatform.mockReturnValue(true);

    const registered = await registerServiceWorker();

    expect(registered).toBe(false);
    expect(registerSW).not.toHaveBeenCalled();
  });
});
