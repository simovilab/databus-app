// Runtime plugin configuration — values the app sets in capacitor.config.ts
// under `plugins.DatabusTelemetry` (read-only at native load time). This is
// the ONLY place broker endpoint / cadence / buffer caps are configured;
// nothing is hardcoded in native source. Per-call overrides come through
// TelemetryStartOptions (see definitions.ts). Credentials are NEVER stored
// here — R5's future auth surface is injected per-call (username/token).
//
// Verified against the Capacitor config-plugin pattern (skill reference
// references/configuration.md "Runtime Plugin Configuration"). The module
// augmentation merges into `@capacitor/cli`'s `PluginsConfig` interface at
// build time in the consuming app (where @capacitor/cli is installed).

declare module '@capacitor/cli' {
  export interface PluginsConfig {
    /**
     * capacitor-databus-telemetry runtime config.
     */
    DatabusTelemetry?: {
      /**
       * MQTT broker hostname (production: the Databús telemetry broker).
       * Required for the native runtime to connect; the TS adapter will
       * surface a clear error if it is missing on `start()`.
       * @since 0.0.1
       */
      brokerHost?: string;
      /**
       * MQTT broker TCP port. Production exposes 8883 (TLS only).
       * @default 8883
       * @since 0.0.1
       */
      brokerPort?: number;
      /**
       * Connect over TLS (mqtts://). Prod is true; set false only for a
       * local plaintext broker (dev tooling, never prod).
       * @default true
       * @since 0.0.1
       */
      useTls?: boolean;
      /**
       * Prefix for the MQTT client id (suffixed with a per-session UUID).
       * @default "databus-"
       * @since 0.0.1
       */
      clientIdPrefix?: string;
      /**
       * GPS sample interval in milliseconds. Battery-aware: higher = less
       * drain, lower = fresher telemetry. The realtime-engine tolerates
       * 5–10s cadence for run-state advancement.
       * @default 5000
       * @since 0.0.1
       */
      gpsIntervalMs?: number;
      /**
       * Minimum distance in meters between fixes. 0 = emit at the interval
       * regardless of movement.
       * @default 5
       * @since 0.0.1
       */
      gpsMinDistanceM?: number;
      /**
       * Maximum fixes held in the native store-and-forward buffer when
       * offline. When exceeded the OLDEST fix is dropped (FIFO drop-head);
       * each fix carries its own epoch timestamp so late/out-of-order
       * delivery is fine server-side (master §8 R7).
       * @default 2000
       * @since 0.0.1
       */
      bufferMaxSize?: number;
      /**
       * Android foreground-service notification channel id.
       * @default "databus-telemetry"
       * @since 0.0.1
       */
      notificationChannelId?: string;
      /**
       * Android foreground-service notification title (shown while a run
       * is active and the phone is locked).
       * @default "Databús transmitiendo"
       * @since 0.0.1
       */
      notificationTitle?: string;
    };
  }
}
