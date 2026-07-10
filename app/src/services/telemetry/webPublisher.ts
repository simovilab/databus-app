// MQTT telemetry publisher — dev/CI transport only (mqtt.js over WebSocket).
// Verified against the MQTT contract in
// ../databus/backend/realtime_engine/mqtt.py +
// ../databus/backend/runs/domain/telemetry/position.py, and mqtt.js usage
// via /find-docs (/mqttjs/mqtt.js): mqtt.connect(url, opts), QoS 0 publish,
// reconnectPeriod, connect/error/close events.
//
// Production telemetry is A5's native TCP+TLS plugin — this module is never
// imported on the native runtime path (see runtime.ts).

import mqtt, { type MqttClient } from 'mqtt';
import type { Fix } from '@/types/domain';

export interface TelemetryPublisher {
  connect(): Promise<void>;
  publishPosition(vehicleId: string, fix: Fix): void; // transit/vehicle/<id>/position
  disconnect(): Promise<void>;
  readonly connected: boolean;
}

/**
 * Seam for future auth (username/token/client-cert on the WS URL or connect
 * options). Dev broker is anonymous — no credentials today (§4.4).
 */
export type TransformWsUrl = (url: string) => string;

function defaultTransformWsUrl(url: string): string {
  return url;
}

function toPositionPayload(fix: Fix): string {
  const payload: Record<string, number> = {
    latitude: fix.latitude,
    longitude: fix.longitude,
  };
  if (fix.bearing !== undefined) payload.bearing = fix.bearing;
  if (fix.speed !== undefined) payload.speed = fix.speed;
  if (fix.timestamp !== undefined) payload.timestamp = fix.timestamp;
  return JSON.stringify(payload);
}

class MqttWebPublisher implements TelemetryPublisher {
  private client: MqttClient | undefined;
  private _connected = false;

  constructor(
    private readonly url: string,
    private readonly transformWsUrl: TransformWsUrl = defaultTransformWsUrl
  ) {}

  get connected(): boolean {
    return this._connected;
  }

  async connect(): Promise<void> {
    const resolvedUrl = this.transformWsUrl(this.url);
    this.client = await mqtt.connectAsync(resolvedUrl, {
      reconnectPeriod: 1000,
      connectTimeout: 10000,
    });
    this._connected = true;

    this.client.on('connect', () => {
      this._connected = true;
    });
    this.client.on('close', () => {
      this._connected = false;
    });
    this.client.on('error', () => {
      // Degrade gracefully — never throw into the render path. The webRuntime
      // owns surfacing `status='buffering'`/`'error'` to the UI.
      this._connected = false;
    });
  }

  publishPosition(vehicleId: string, fix: Fix): void {
    if (!this.client) {
      return;
    }
    const topic = `transit/vehicle/${vehicleId}/position`;
    this.client.publish(topic, toPositionPayload(fix), { qos: 0, retain: false });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.endAsync();
      this.client = undefined;
    }
    this._connected = false;
  }
}

/**
 * Creates the web MQTT publisher. `url` defaults to
 * import.meta.env.VITE_MQTT_URL (host+port+path fully config-driven —
 * see master §7/§8 R1).
 */
export function createTelemetryPublisher(url?: string): TelemetryPublisher {
  const resolvedUrl = url ?? (import.meta.env.VITE_MQTT_URL as string | undefined);
  if (!resolvedUrl) {
    throw new Error(
      'VITE_MQTT_URL is not configured (set it in app/.env, see .env.example)'
    );
  }
  return new MqttWebPublisher(resolvedUrl);
}
