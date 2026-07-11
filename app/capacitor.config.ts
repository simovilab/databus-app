import type { CapacitorConfig } from '@capacitor/cli';

// Runtime config for the capacitor-databus-telemetry native plugin (A5).
// brokerHost is REQUIRED for a native device build — the plugin rejects
// start() with a clear error if it is missing. Set it to the production
// Databús telemetry broker once ops confirms the host (see
// plugins/capacitor-databus-telemetry/README.md "Asks for the databus/ops
// team"). Defaults: brokerPort 8883 (TLS), useTls true — prod exposes raw
// TCP+TLS only (master §8 R5). Credentials are NEVER set here; R5 auth is
// injected per-call via TelemetryStartOptions.
const config: CapacitorConfig = {
  appId: 'org.simovi.databus.app',
  appName: 'Databús',
  webDir: 'dist',
  plugins: {
    DatabusTelemetry: {
      // TODO(ops): set to the prod telemetry broker host before a native build.
      brokerHost: 'mqtt.example.com',
      brokerPort: 8883,
      useTls: true,
    },
  },
};

export default config;
