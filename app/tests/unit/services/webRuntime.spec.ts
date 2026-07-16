import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Fix } from '@/types/domain';

let onFixCapture: ((fix: Fix) => void) | undefined;
let onErrorCapture: ((e: unknown) => void) | undefined;

const fakeWatcher = {
  start: vi.fn(async (onFix: (fix: Fix) => void, onError?: (e: unknown) => void) => {
    onFixCapture = onFix;
    onErrorCapture = onError;
  }),
  stop: vi.fn(async () => {}),
};

const fakePublisher = {
  connect: vi.fn(async () => {
    fakePublisher.connected = true;
  }),
  publishPosition: vi.fn(),
  disconnect: vi.fn(async () => {
    fakePublisher.connected = false;
  }),
  connected: false,
};

vi.mock('@/services/geolocation', () => ({
  createPositionWatcher: () => fakeWatcher,
}));

vi.mock('@/services/telemetry/webPublisher', () => ({
  createTelemetryPublisher: () => fakePublisher,
}));

import { createWebRuntime } from '@/services/telemetry/webRuntime';

const fix1: Fix = { latitude: 9.9363, longitude: -84.0474, timestamp: 1720600000 };
const fix2: Fix = { latitude: 9.9364, longitude: -84.0475, timestamp: 1720600005 };

describe('createWebRuntime', () => {
  beforeEach(() => {
    onFixCapture = undefined;
    onErrorCapture = undefined;
    fakeWatcher.start.mockClear();
    fakeWatcher.stop.mockClear();
    fakePublisher.connect.mockClear();
    fakePublisher.publishPosition.mockClear();
    fakePublisher.disconnect.mockClear();
    fakePublisher.connected = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('when VITE_TELEMETRY_ENABLED=false (web build with no broker)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_TELEMETRY_ENABLED', 'false');
    });

    it('reports status=unavailable instead of the misleading buffering state', async () => {
      const runtime = createWebRuntime();
      await runtime.start({ vehicleId: 'veh-1' });

      // 'buffering' promises store-and-forward: "held locally, flushed on
      // reconnect". With no broker to reconnect to that is a lie, so the
      // disabled build must report its own state.
      expect(runtime.status.value).toBe('unavailable');
    });

    it('never constructs a publisher or prompts for GPS', async () => {
      const runtime = createWebRuntime();
      await runtime.start({ vehicleId: 'veh-1' });

      // No publisher => no 1/sec DNS-failing reconnect loop on a phone.
      expect(fakePublisher.connect).not.toHaveBeenCalled();
      // No watcher => no location permission prompt for data that goes nowhere.
      expect(fakeWatcher.start).not.toHaveBeenCalled();
      expect(runtime.queuedCount.value).toBe(0);
      expect(runtime.lastFix.value).toBeNull();
    });

    it('stop() is safe and returns to idle', async () => {
      const runtime = createWebRuntime();
      await runtime.start({ vehicleId: 'veh-1' });
      await runtime.stop();

      expect(fakeWatcher.stop).not.toHaveBeenCalled();
      expect(fakePublisher.disconnect).not.toHaveBeenCalled();
      expect(runtime.status.value).toBe('idle');
    });
  });

  it('stays enabled when the flag is unset (dev default)', async () => {
    const runtime = createWebRuntime();
    await runtime.start({ vehicleId: 'veh-1' });

    expect(fakePublisher.connect).toHaveBeenCalledTimes(1);
    expect(fakeWatcher.start).toHaveBeenCalledTimes(1);
    expect(runtime.status.value).not.toBe('unavailable');
  });

  it('starts idle, then streams once connected and a fix arrives', async () => {
    const runtime = createWebRuntime();
    expect(runtime.status.value).toBe('idle');

    await runtime.start({ vehicleId: 'veh-1' });
    expect(fakePublisher.connect).toHaveBeenCalledTimes(1);
    expect(fakeWatcher.start).toHaveBeenCalledTimes(1);

    onFixCapture?.(fix1);

    expect(runtime.status.value).toBe('streaming');
    expect(runtime.lastFix.value).toEqual(fix1);
    expect(fakePublisher.publishPosition).toHaveBeenCalledWith('veh-1', fix1);
  });

  it('buffers fixes and reports status=buffering while disconnected', async () => {
    fakePublisher.connect.mockImplementationOnce(async () => {
      fakePublisher.connected = false; // simulate a failed/slow initial connect
    });
    const runtime = createWebRuntime();
    await runtime.start({ vehicleId: 'veh-1' });

    onFixCapture?.(fix1);

    expect(runtime.status.value).toBe('buffering');
    expect(runtime.queuedCount.value).toBe(1);
    expect(fakePublisher.publishPosition).not.toHaveBeenCalled();
  });

  it('flushes the queue and returns to streaming once the publisher reconnects', async () => {
    fakePublisher.connect.mockImplementationOnce(async () => {
      fakePublisher.connected = false;
    });
    const runtime = createWebRuntime();
    await runtime.start({ vehicleId: 'veh-1' });

    onFixCapture?.(fix1); // queued while disconnected
    expect(runtime.queuedCount.value).toBe(1);

    fakePublisher.connected = true; // broker reconnects
    onFixCapture?.(fix2);

    expect(fakePublisher.publishPosition).toHaveBeenNthCalledWith(1, 'veh-1', fix1);
    expect(fakePublisher.publishPosition).toHaveBeenNthCalledWith(2, 'veh-1', fix2);
    expect(runtime.queuedCount.value).toBe(0);
    expect(runtime.status.value).toBe('streaming');
  });

  it('degrades gracefully on watcher errors without throwing', async () => {
    const runtime = createWebRuntime();
    await runtime.start({ vehicleId: 'veh-1' });

    expect(() => onErrorCapture?.(new Error('gps denied'))).not.toThrow();
    expect(runtime.status.value).toBe('buffering');
  });

  it('goes to buffering when publisher.connect() throws at startup (mqtt.js keeps retrying)', async () => {
    fakePublisher.connect.mockImplementationOnce(async () => {
      throw new Error('ECONNREFUSED');
    });
    const runtime = createWebRuntime();

    await runtime.start({ vehicleId: 'veh-1' });

    expect(runtime.status.value).toBe('buffering');
    expect(fakeWatcher.start).toHaveBeenCalledTimes(1);
  });

  it('goes to error when the position watcher fails to start', async () => {
    fakeWatcher.start.mockImplementationOnce(async () => {
      throw new Error('permission denied');
    });
    const runtime = createWebRuntime();

    await runtime.start({ vehicleId: 'veh-1' });

    expect(runtime.status.value).toBe('error');
  });

  it('stop() tears down the watcher and publisher and resets to idle', async () => {
    const runtime = createWebRuntime();
    await runtime.start({ vehicleId: 'veh-1' });
    onFixCapture?.(fix1);

    await runtime.stop();

    expect(fakeWatcher.stop).toHaveBeenCalledTimes(1);
    expect(fakePublisher.disconnect).toHaveBeenCalledTimes(1);
    expect(runtime.status.value).toBe('idle');
    expect(runtime.queuedCount.value).toBe(0);
  });
});
