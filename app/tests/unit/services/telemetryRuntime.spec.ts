import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the web runtime so the factory's web branch is a sentinel we can assert.
const { webRuntimeSentinel, createWebRuntime } = vi.hoisted(() => {
  const webRuntimeSentinel = { source: 'web' };
  const createWebRuntime = vi.fn(() => webRuntimeSentinel);
  return { webRuntimeSentinel, createWebRuntime };
});

vi.mock('@/services/telemetry/webRuntime', () => ({
  createWebRuntime,
}));

// Mock the native plugin so the adapter can be exercised in jsdom without a
// native bridge. addListener returns a fake handle whose remove() is a no-op.
const { pluginStart, pluginStop, addListener, listenerHandle } = vi.hoisted(() => {
  const listenerHandle = { remove: vi.fn(async () => undefined) };
  const addListener = vi.fn(async () => listenerHandle);
  const pluginStart = vi.fn(async () => undefined);
  const pluginStop = vi.fn(async () => undefined);
  return { pluginStart, pluginStop, addListener, listenerHandle };
});

vi.mock('capacitor-databus-telemetry', () => ({
  DatabusTelemetry: { start: pluginStart, stop: pluginStop, addListener },
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
    // The real adapter starts idle (the previous "stub" returned 'error').
    expect(runtime.status.value).toBe('idle');
  });
});

describe('createNativeRuntime() adapter over the native plugin', () => {
  beforeEach(() => {
    pluginStart.mockClear();
    pluginStop.mockClear();
    addListener.mockClear();
    listenerHandle.remove.mockClear();
  });

  it('starts idle and does not touch the plugin until start()', () => {
    const runtime = createNativeRuntime();
    expect(runtime.status.value).toBe('idle');
    expect(runtime.lastFix.value).toBeNull();
    expect(runtime.queuedCount.value).toBe(0);
    expect(pluginStart).not.toHaveBeenCalled();
  });

  it('start() wires all three listeners and forwards vehicleId to the plugin', async () => {
    const runtime = createNativeRuntime();
    await runtime.start({ vehicleId: 'veh-1' });
    expect(addListener).toHaveBeenCalledTimes(3); // status, lastFix, queuedCount
    expect(pluginStart).toHaveBeenCalledWith({ vehicleId: 'veh-1' });
    // No status event yet → stays 'starting' until the plugin emits.
    expect(runtime.status.value).toBe('starting');
  });

  it('maps a plugin status event onto the status ref', async () => {
    const runtime = createNativeRuntime();
    await runtime.start({ vehicleId: 'veh-1' });
    const statusCall = addListener.mock.calls.find((c) => c[0] === 'status');
    expect(statusCall).toBeTruthy();
    const onStatus = statusCall![1] as (e: { status: string }) => void;
    onStatus({ status: 'streaming' });
    expect(runtime.status.value).toBe('streaming');
  });

  it('start() surfaces a plugin rejection as status=error and rethrows', async () => {
    pluginStart.mockRejectedValueOnce(new Error('permission denied'));
    const runtime = createNativeRuntime();
    await expect(runtime.start({ vehicleId: 'veh-1' })).rejects.toThrow(
      'permission denied',
    );
    expect(runtime.status.value).toBe('error');
  });

  it('stop() calls the plugin, removes listeners, resets to idle, and never throws', async () => {
    pluginStop.mockRejectedValueOnce(new Error('boom')); // must be swallowed
    const runtime = createNativeRuntime();
    await runtime.start({ vehicleId: 'veh-1' });
    await expect(runtime.stop()).resolves.toBeUndefined();
    expect(pluginStop).toHaveBeenCalled();
    expect(listenerHandle.remove).toHaveBeenCalled();
    expect(runtime.status.value).toBe('idle');
  });
});
