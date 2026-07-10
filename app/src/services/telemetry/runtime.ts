// The TelemetryRuntime seam — one interface, two implementations, selected
// by platform (master §6.3 / §6.6). The run store owns start()/stop() so
// telemetry survives RunProgress unmounting or the phone locking.

import { Capacitor } from '@capacitor/core';
import type { Ref } from 'vue';
import type { Fix } from '@/types/domain';
import { createWebRuntime } from '@/services/telemetry/webRuntime';
import { createNativeRuntime } from '@/services/telemetry/nativeRuntime';

export type TelemetryStatus = 'idle' | 'starting' | 'streaming' | 'buffering' | 'error';

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
