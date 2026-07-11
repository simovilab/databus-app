// NativeTelemetryRuntime — the production telemetry hot path on a real device
// (master plan §6.3, §6.6, §8 R5–R7). A thin TS adapter over the
// `capacitor-databus-telemetry` native plugin: MQTT over TCP+TLS 8883,
// Android foreground service / iOS background location, native GPS, and a
// native store-and-forward buffer.
//
// This implements the same `TelemetryRuntime` interface A4 already consumes
// for the web path; `createTelemetryRuntime()` (runtime.ts) selects it when
// `Capacitor.isNativePlatform()` is true. It never falls back to the web/WS
// transport — raw TCP is required in prod and a webview can't do it.
//
// The plugin owns the acquire → buffer → publish loop (a suspended webview
// cannot run JS), so this adapter only:
//   1. forwards `start({vehicleId})` / `stop()` to the plugin,
//   2. maps the plugin's `status` / `lastFix` / `queuedCount` event stream
//      onto the reactive refs A4 reads, and
//   3. manages listener lifecycles (removed on `stop()` so nothing leaks).

import { ref, type Ref } from 'vue';
import type { PluginListenerHandle } from '@capacitor/core';
import { DatabusTelemetry } from 'capacitor-databus-telemetry';
import type {
  TelemetryConnectionStatus,
  TelemetryFixEvent,
  TelemetryStatusEvent,
  TelemetryQueuedCountEvent,
} from 'capacitor-databus-telemetry';
import type { Fix } from '@/types/domain';
import type { TelemetryRuntime, TelemetryStatus } from '@/services/telemetry/runtime';

/**
 * The plugin's `TelemetryConnectionStatus` maps 1:1 to the app's
 * `TelemetryStatus` (both are the same string union — see definitions.ts and
 * runtime.ts). This narrowing keeps the mapping explicit and compile-checked.
 */
function toAppStatus(status: TelemetryConnectionStatus): TelemetryStatus {
  return status; // identical union: idle | starting | streaming | buffering | error
}

/**
 * Adapter implementing {@link TelemetryRuntime} by delegating to the native
 * `capacitor-databus-telemetry` plugin. Created only on native platforms.
 */
export function createNativeRuntime(): TelemetryRuntime {
  const status: Ref<TelemetryStatus> = ref('idle');
  const lastFix: Ref<Fix | null> = ref(null);
  const queuedCount: Ref<number> = ref(0);

  // Listener handles removed on stop() so no event fires after teardown.
  let statusHandle: PluginListenerHandle | undefined;
  let fixHandle: PluginListenerHandle | undefined;
  let queueHandle: PluginListenerHandle | undefined;

  async function start(cfg: { vehicleId: string }): Promise<void> {
    // Tear down any prior session before starting a fresh one.
    await removeListeners();

    status.value = 'starting';
    lastFix.value = null;
    queuedCount.value = 0;

    // Wire the native event stream → reactive refs BEFORE start(), so the
    // first status transition (starting → streaming/buffering) is captured.
    statusHandle = await DatabusTelemetry.addListener('status', (e: TelemetryStatusEvent) => {
      status.value = toAppStatus(e.status);
    });
    fixHandle = await DatabusTelemetry.addListener('lastFix', (e: TelemetryFixEvent) => {
      // §4.4 payload shape == Fix shape (lat/lon req; bearing/speed opt float;
      // timestamp opt epoch-seconds int). Copy immutably.
      lastFix.value = {
        latitude: e.latitude,
        longitude: e.longitude,
        bearing: e.bearing,
        speed: e.speed,
        timestamp: e.timestamp,
      };
    });
    queueHandle = await DatabusTelemetry.addListener('queuedCount', (e: TelemetryQueuedCountEvent) => {
      queuedCount.value = e.count;
    });

    try {
      // Broker host/port/TLS come from the Capacitor config
      // (plugins.DatabusTelemetry) read by the native layer — not passed here.
      // Future R5 auth (username/token/caCertAsset) would be forwarded via
      // start options when the ops auth scheme lands.
      await DatabusTelemetry.start({ vehicleId: cfg.vehicleId });
    } catch (err: unknown) {
      // start() rejected (e.g. permission denied, brokerHost unset) — surface
      // it via the status ref and rethrow so the run store can react.
      status.value = 'error';
      await removeListeners();
      throw err;
    }
  }

  async function stop(): Promise<void> {
    try {
      // stop() flushes best-effort, ends the foreground service / background
      // location, releases GPS, and clears the native buffer — idempotent.
      await DatabusTelemetry.stop();
    } catch {
      // Swallow: the run is ending regardless; never throw out of stop().
    } finally {
      await removeListeners();
      status.value = 'idle';
      lastFix.value = null;
      queuedCount.value = 0;
    }
  }

  async function removeListeners(): Promise<void> {
    const handles = [statusHandle, fixHandle, queueHandle];
    statusHandle = undefined;
    fixHandle = undefined;
    queueHandle = undefined;
    await Promise.all(
      handles.map((h) => (h ? h.remove().catch(() => undefined) : undefined)),
    );
  }

  return { start, stop, status, lastFix, queuedCount };
}
