// The TelemetryRuntime seam — one interface, two implementations, selected
// by platform (master §6.3 / §6.6). The run store owns start()/stop() so
// telemetry survives RunProgress unmounting or the phone locking.

import { Capacitor } from '@capacitor/core';
import type { Ref } from 'vue';
import type { Fix } from '@/types/domain';
import { createWebRuntime } from '@/services/telemetry/webRuntime';
import { createNativeRuntime } from '@/services/telemetry/nativeRuntime';

// 'unavailable' = this build has no telemetry transport at all (web/PWA built
// with VITE_TELEMETRY_ENABLED=false, because prod exposes raw TCP+TLS 8883 and
// no WS listener). Distinct from 'buffering', which promises store-and-forward:
// fixes held locally and flushed on reconnect. With no broker to reconnect to
// that promise is false, so the disabled build needs its own honest state.
// Never set by the native runtime.
export type TelemetryStatus =
  | 'idle'
  | 'starting'
  | 'streaming'
  | 'buffering'
  | 'error'
  | 'unavailable';

export interface TelemetryRuntime {
  start(cfg: { vehicleId: string }): Promise<void>; // begins GPS + publishing
  stop(): Promise<void>; // stops GPS + publishing, flushes/cleans up
  readonly status: Ref<TelemetryStatus>; // 'buffering' = offline, queuing locally
  readonly lastFix: Ref<Fix | null>;
  readonly queuedCount: Ref<number>; // fixes held in store-and-forward buffer
}

/**
 * Picks the platform implementation:
 *   Capacitor.isNativePlatform() → NativeTelemetryRuntime (A5 plugin: TCP+TLS)
 *   else                         → WebTelemetryRuntime (browser GPS + mqtt.js WS)
 */
export function createTelemetryRuntime(): TelemetryRuntime {
  return Capacitor.isNativePlatform() ? createNativeRuntime() : createWebRuntime();
}
