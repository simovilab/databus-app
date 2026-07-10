import { afterEach, describe, expect, it, vi } from 'vitest';

const { webRuntimeSentinel, createWebRuntime } = vi.hoisted(() => {
  const webRuntimeSentinel = { source: 'web' };
  const createWebRuntime = vi.fn(() => webRuntimeSentinel);
  return { webRuntimeSentinel, createWebRuntime };
});

vi.mock('@/services/telemetry/webRuntime', () => ({
  createWebRuntime,
}));

import { Capacitor } from '@capacitor/core';
import { createTelemetryRuntime } from '@/services/telemetry/runtime';
import { createNativeRuntime } from '@/services/telemetry/nativeRuntime';

describe('createTelemetryRuntime() platform factory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('selects the web runtime when not on a native platform (jsdom = web)', () => {
    expect(Capacitor.isNativePlatform()).toBe(false);
    const runtime = createTelemetryRuntime();
    expect(runtime).toBe(webRuntimeSentinel);
    expect(createWebRuntime).toHaveBeenCalledTimes(1);
  });

  it('selects the native runtime when Capacitor.isNativePlatform() is true', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const runtime = createTelemetryRuntime();
    expect(createWebRuntime).not.toHaveBeenCalled();
    expect(runtime.status.value).toBe('error');
  });
});

describe('createNativeRuntime() temporary stub (owned by Agent A5)', () => {
  it('reports status=error and never streams — must not fall back to WS on native', async () => {
    const runtime = createNativeRuntime();
    expect(runtime.status.value).toBe('error');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await runtime.start({ vehicleId: 'veh-1' });

    expect(runtime.status.value).toBe('error');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('native runtime not linked'));
    errorSpy.mockRestore();
  });

  it('stop() resets status to idle and is safe to call', async () => {
    const runtime = createNativeRuntime();
    await runtime.stop();
    expect(runtime.status.value).toBe('idle');
  });
});
