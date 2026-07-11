// Web implementation of the telemetry plugin surface.
//
// Production telemetry on a real device goes through the native bridge
// (MQTT over TCP+TLS 8883, foreground service, native buffer — see the
// Android/iOS sources). A webview cannot open raw TCP and a suspended
// webview stops running JS, so there is no faithful web equivalent.
//
// The app's dev/CI telemetry path does NOT use this plugin — it uses the
// separate WebTelemetryRuntime (mqtt.js over WebSocket) owned by Agent A2.
// `createTelemetryRuntime()` only selects the native runtime when
// `Capacitor.isNativePlatform()` is true, so this Web class is effectively
// a safety net that tells callers to use the web runtime instead.

import { WebPlugin } from '@capacitor/core';

import type {
  DatabusTelemetryPlugin,
  TelemetryPermissionStatus,
  TelemetryStartOptions,
} from './definitions';

const NATIVE_ONLY_MESSAGE =
  'capacitor-databus-telemetry is a native-only plugin (MQTT over TCP+TLS). ' +
  'On web, the app uses the WebTelemetryRuntime (mqtt.js over WebSocket) — ' +
  'see app/src/services/telemetry/runtime.ts.';

export class DatabusTelemetryWeb
  extends WebPlugin
  implements DatabusTelemetryPlugin
{
  async start(_options: TelemetryStartOptions): Promise<void> {
    throw this.unimplemented(NATIVE_ONLY_MESSAGE);
  }

  async stop(): Promise<void> {
    throw this.unimplemented(NATIVE_ONLY_MESSAGE);
  }

  async checkPermissions(): Promise<TelemetryPermissionStatus> {
    // The Permissions API can report geolocation on the web, but the hot
    // path itself is native-only; surface a prompt state so the app can
    // fall back to its web runtime's own permission flow.
    return { location: 'prompt' };
  }

  async requestPermissions(): Promise<TelemetryPermissionStatus> {
    throw this.unimplemented(NATIVE_ONLY_MESSAGE);
  }
}
