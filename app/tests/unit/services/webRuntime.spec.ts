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
