// TEMPORARY STUB — owned by Agent A5 (see plans/master-plan.md §9, Agent A5).
//
// A5 delivers the real NativeTelemetryRuntime here: a thin TS adapter over
// the `capacitor-databus-telemetry` native plugin (MQTT over TCP+TLS 8883,
// background/foreground service, native store-and-forward). This stub exists
// only so `runtime.ts`'s createTelemetryRuntime() factory compiles and the
// app doesn't crash when run on a native build before A5 lands — it must be
// replaced wholesale, not extended.
//
// Per master §9 integration order: "native impl behind a stub that throws
// 'native runtime not linked'" — this never falls back to the web/WS
// transport on native (raw TCP is required in prod; a webview can't do it).

import { ref } from 'vue';
import type { TelemetryRuntime } from '@/services/telemetry/runtime';

const NOT_LINKED_MESSAGE =
  'native runtime not linked — Agent A5 has not landed capacitor-databus-telemetry yet';

export function createNativeRuntime(): TelemetryRuntime {
  const status = ref<TelemetryRuntime['status']['value']>('error');
  const lastFix = ref(null) as TelemetryRuntime['lastFix'];
  const queuedCount = ref(0);

  async function start(): Promise<void> {
    status.value = 'error';
    // eslint-disable-next-line no-console
    console.error(NOT_LINKED_MESSAGE);
  }

  async function stop(): Promise<void> {
    status.value = 'idle';
  }

  return { start, stop, status, lastFix, queuedCount };
}
