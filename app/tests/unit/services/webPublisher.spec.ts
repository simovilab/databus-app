import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeClient, connectAsync } = vi.hoisted(() => {
  const fakeClient = {
    on: vi.fn(),
    publish: vi.fn(),
    endAsync: vi.fn(async () => {}),
  };
  const connectAsync = vi.fn(async () => fakeClient);
  return { fakeClient, connectAsync };
});

vi.mock('mqtt', () => ({
  default: { connectAsync },
  connectAsync,
}));

import { createTelemetryPublisher } from '@/services/telemetry/webPublisher';

describe('createTelemetryPublisher (mqtt.js over WebSocket)', () => {
  beforeEach(() => {
    connectAsync.mockClear();
    fakeClient.on.mockClear();
    fakeClient.publish.mockClear();
    fakeClient.endAsync.mockClear();
    vi.stubEnv('VITE_MQTT_URL', 'ws://localhost:8083/mqtt');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when no URL is configured and none is passed explicitly', () => {
    // Force empty (unstubAllEnvs would restore a local .env value, hiding this).
    vi.stubEnv('VITE_MQTT_URL', '');
    expect(() => createTelemetryPublisher()).toThrow('VITE_MQTT_URL');
  });

  it('connects with connectAsync against the configured URL and reconnectPeriod', async () => {
    const publisher = createTelemetryPublisher();
    await publisher.connect();

    expect(connectAsync).toHaveBeenCalledWith(
      'ws://localhost:8083/mqtt',
      expect.objectContaining({ reconnectPeriod: 1000 })
    );
    expect(publisher.connected).toBe(true);
  });

  it('publishes to transit/vehicle/<id>/position with QoS 0 and the correct JSON fields', async () => {
    const publisher = createTelemetryPublisher();
    await publisher.connect();

    publisher.publishPosition('veh-42', {
      latitude: 9.9363,
      longitude: -84.0474,
      bearing: 180,
      speed: 8.3,
      timestamp: 1720600000,
    });

    expect(fakeClient.publish).toHaveBeenCalledTimes(1);
    const [topic, payload, opts] = fakeClient.publish.mock.calls[0];
    expect(topic).toBe('transit/vehicle/veh-42/position');
    expect(opts).toEqual({ qos: 0, retain: false });
    expect(JSON.parse(payload)).toEqual({
      latitude: 9.9363,
      longitude: -84.0474,
      bearing: 180,
      speed: 8.3,
      timestamp: 1720600000,
    });
  });

  it('omits optional fields from the payload when absent', async () => {
    const publisher = createTelemetryPublisher();
    await publisher.connect();

    publisher.publishPosition('veh-1', { latitude: 1, longitude: 2 });

    const [, payload] = fakeClient.publish.mock.calls[0];
    expect(JSON.parse(payload)).toEqual({ latitude: 1, longitude: 2 });
  });

  it('is a no-op publish before connect() (no client yet)', () => {
    const publisher = createTelemetryPublisher();
    expect(() => publisher.publishPosition('veh-1', { latitude: 1, longitude: 2 })).not.toThrow();
    expect(fakeClient.publish).not.toHaveBeenCalled();
  });

  it('marks connected=false on the "close" and "error" events (graceful degradation)', async () => {
    const publisher = createTelemetryPublisher();
    await publisher.connect();
    expect(publisher.connected).toBe(true);

    const closeHandler = fakeClient.on.mock.calls.find(([event]) => event === 'close')?.[1];
    closeHandler?.();
    expect(publisher.connected).toBe(false);

    const errorHandler = fakeClient.on.mock.calls.find(([event]) => event === 'error')?.[1];
    // Must never throw — graceful degradation.
    expect(() => errorHandler?.(new Error('boom'))).not.toThrow();
    expect(publisher.connected).toBe(false);
  });

  it('disconnect() ends the mqtt.js connection and marks disconnected', async () => {
    const publisher = createTelemetryPublisher();
    await publisher.connect();

    await publisher.disconnect();

    expect(fakeClient.endAsync).toHaveBeenCalledTimes(1);
    expect(publisher.connected).toBe(false);
  });

  it('accepts an explicit url override instead of VITE_MQTT_URL', async () => {
    const publisher = createTelemetryPublisher('ws://override:9001/mqtt');
    await publisher.connect();
    expect(connectAsync).toHaveBeenCalledWith(
      'ws://override:9001/mqtt',
      expect.anything()
    );
  });
});
