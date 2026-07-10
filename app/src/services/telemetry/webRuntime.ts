// Web TelemetryRuntime: browser GPS (Capacitor Geolocation w/ web fallback)
// + mqtt.js over WebSocket, with an in-memory store-and-forward queue for
// transient disconnects. This is the dev/CI transport only — see runtime.ts
// for platform selection and webPublisher.ts for the MQTT contract notes.

import { ref, type Ref } from 'vue';
import { createPositionWatcher, type PositionWatcher } from '@/services/geolocation';
import { createTelemetryPublisher, type TelemetryPublisher } from '@/services/telemetry/webPublisher';
import type { Fix } from '@/types/domain';
import type { TelemetryRuntime, TelemetryStatus } from '@/services/telemetry/runtime';

/** Cap the in-memory buffer so a long disconnect can't grow it unbounded. */
const MAX_QUEUED_FIXES = 500;

export function createWebRuntime(): TelemetryRuntime {
  const status: Ref<TelemetryStatus> = ref('idle');
  const lastFix: Ref<Fix | null> = ref(null);
  const queuedCount: Ref<number> = ref(0);

  let watcher: PositionWatcher | undefined;
  let publisher: TelemetryPublisher | undefined;
  let vehicleId: string | undefined;
  let queue: Fix[] = [];

  function flushQueue(): void {
    if (!publisher || !vehicleId || !publisher.connected) {
      return;
    }
    for (const fix of queue) {
      publisher.publishPosition(vehicleId, fix);
    }
    queue = [];
    queuedCount.value = 0;
    if (status.value === 'buffering') {
      status.value = 'streaming';
    }
  }

  function handleFix(fix: Fix): void {
    lastFix.value = fix;
    if (!publisher || !vehicleId) {
      return;
    }
    if (publisher.connected) {
      flushQueue();
      publisher.publishPosition(vehicleId, fix);
      status.value = 'streaming';
    } else {
      queue.push(fix);
      if (queue.length > MAX_QUEUED_FIXES) {
        queue.shift();
      }
      queuedCount.value = queue.length;
      status.value = 'buffering';
    }
  }

  function handleError(): void {
    // Degrade gracefully: never throw into the render path. Keep buffering
    // fixes locally; the UI reads `status` to reflect the situation.
    if (status.value !== 'error') {
      status.value = 'buffering';
    }
  }

  async function start(cfg: { vehicleId: string }): Promise<void> {
    status.value = 'starting';
    vehicleId = cfg.vehicleId;
    queue = [];
    queuedCount.value = 0;

    publisher = createTelemetryPublisher();
    try {
      await publisher.connect();
    } catch {
      // Connection failed at startup — keep going in buffering mode; the
      // mqtt.js client will keep retrying via reconnectPeriod.
      status.value = 'buffering';
    }

    watcher = createPositionWatcher();
    try {
      await watcher.start(handleFix, handleError);
      if (status.value === 'starting') {
        status.value = publisher.connected ? 'streaming' : 'buffering';
      }
    } catch {
      status.value = 'error';
    }
  }

  async function stop(): Promise<void> {
    if (watcher) {
      await watcher.stop();
      watcher = undefined;
    }
    if (publisher) {
      await publisher.disconnect();
      publisher = undefined;
    }
    vehicleId = undefined;
    queue = [];
    queuedCount.value = 0;
    status.value = 'idle';
  }

  return { start, stop, status, lastFix, queuedCount };
}
