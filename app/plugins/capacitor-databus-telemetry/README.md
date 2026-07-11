# capacitor-databus-telemetry

Native production telemetry plugin for the Databús operator app. It owns the
**hot path** that a webview cannot: MQTT over **raw TCP+TLS to `:8883`**
(production exposes no WebSocket listener — master plan §1, §4.4, §8 R5),
native GPS acquisition, **background survival** (Android foreground service /
iOS background-location mode), and a native **store-and-forward** buffer for
cellular dropouts (R7). The webview's JS suspends when the phone is locked, so
this plugin runs the entire acquire → buffer → publish loop in native code.

The app consumes it through the `NativeTelemetryRuntime` TS adapter
(`app/src/services/telemetry/nativeRuntime.ts`), which implements the
`TelemetryRuntime` seam (master plan §6.3) by mapping this plugin's
`status` / `lastFix` / `queuedCount` event stream onto reactive refs.

> MQTT topic + payload are verified against the backend
> (`databus/backend/realtime_engine/mqtt.py` +
> `databus/backend/runs/domain/telemetry/position.py`):
> publish to `transit/vehicle/<vehicleId>/position`, **QoS 0**,
> `{ latitude, longitude, bearing?, speed?, timestamp? }`
> (lat/lon required floats; bearing/speed optional floats; timestamp optional
> epoch-**seconds** int).

## Native client libraries

| Platform | MQTT client | Why | GPS | License |
|---|---|---|---|---|
| **Android** | [HiveMQ MQTT Client](https://github.com/hivemq/hivemq-mqtt-client) `1.3.5` | Fully async (non-blocking, no thread management), built-in exponential-backoff auto-reconnect (R7), first-class TLS with pluggable trust managers for the broker CA, MQTT 3.1.1 + 5. Paho is blocking/thread-heavy by comparison. | FusedLocationProvider (`play-services-location`) — battery-aware, balanced power | Apache-2.0 |
| **iOS** | [CocoaMQTT](https://github.com/emqx/CocoaMQTT) `~> 2.0` | Most-maintained Swift MQTT client; first-class TLS (`enableSSL`), auto-reconnect, background-safe sockets (no extra threading), MQTT 3.1.1 matching the backend's paho consumer. | `CLLocationManager` with `allowsBackgroundLocationUpdates` | MIT |

Both speak MQTT 3.1.1 to match the backend paho consumer (`mqtt.py`).

## Install

The plugin is a local package, wired as a `file:` dependency in
`app/package.json`:

```json
"capacitor-databus-telemetry": "file:plugins/capacitor-databus-telemetry"
```

```bash
# from app/
npm install                       # links the local plugin into node_modules
# build the plugin TS → dist/ (the app resolves types/module from dist)
cd plugins/capacitor-databus-telemetry && npm run build && cd ..
npx cap sync                      # copies native sources into android/ios
```

> **Build the plugin before building the app.** `app/npm run build`
> (`vue-tsc`) resolves the plugin's types from `dist/esm/index.d.ts`. If you
> change `src/`, re-run `npm run build` in the plugin dir (the `dist/` folder
> is gitignored). The plugin `build` script also regenerates this README via
> `docgen`; to keep hand-edits, run `npx tsc && npx rollup -c` instead.

## Configuration

Broker endpoint, cadence, and buffer caps are **config-driven** — read from
the Capacitor config (`capacitor.config.ts` → `plugins.DatabusTelemetry`),
never hardcoded in native source. Add this to `app/capacitor.config.ts`
**(A1/ops: this is a required config step — the plugin rejects `start()` with
a clear error if `brokerHost` is unset)**:

```ts
const config: CapacitorConfig = {
  appId: 'org.simovi.databus.app',
  appName: 'Databús',
  webDir: 'dist',
  plugins: {
    DatabusTelemetry: {
      brokerHost: '<telemetry-broker-host>',   // REQUIRED (prod: the Databús broker)
      brokerPort: 8883,                        // default 8883 (TLS)
      useTls: true,                            // default true in prod
      clientIdPrefix: 'databus-',
      gpsIntervalMs: 5000,                     // 5s; realtime-engine tolerates 5–10s
      gpsMinDistanceM: 5,                      // 0 = emit regardless of movement
      bufferMaxSize: 2000,                     // drop-head (FIFO) when exceeded
      notificationChannelId: 'databus-telemetry',
      notificationTitle: 'Databús transmitiendo',
    },
  },
};
```

Per-call overrides come through `TelemetryStartOptions` (brokerHost, brokerPort,
useTls, and the future auth fields). The TS config surface is typed in
`src/config.ts` (module-augments `@capacitor/cli`'s `PluginsConfig`).

### TLS trust chain & future auth (R5)

- **Trust:** with `useTls: true`, both platforms use the **system default
  trust store**. Once ops registers the broker's CA with the OS, connections
  validate normally. A `caCertAsset` start option exists as the future surface
  for pinning a PEM CA bundle from app assets (not yet wired end-to-end — see
  "Asks for the databus/ops team").
- **Auth (R5, future):** `username` / `token` start options forward MQTT
  credentials over the TLS socket only; they are **never persisted** to config
  or storage. The native layer does not log them. The actual scheme
  (username+token vs. client certificate) is pending the ops auth decision.

## API

`start`, `stop`, `checkPermissions`, `requestPermissions`, plus three event
listeners (`status`, `lastFix`, `queuedCount`). Full TS contract:
[`src/definitions.ts`](src/definitions.ts).

```ts
import { DatabusTelemetry } from 'capacitor-databus-telemetry';

await DatabusTelemetry.start({ vehicleId: 'BUS-001' });

DatabusTelemetry.addListener('status', e => {
  // e.status: 'idle' | 'starting' | 'streaming' | 'buffering' | 'error'
});
DatabusTelemetry.addListener('lastFix', f => { /* {latitude,longitude,bearing?,speed?,timestamp?} */ });
DatabusTelemetry.addListener('queuedCount', e => { /* {count} */ });

await DatabusTelemetry.stop();   // ends service, flushes best-effort, releases GPS — idempotent
```

### Store-and-forward & drop policy

When the broker is unreachable, fixes are held in a bounded in-memory ring
buffer (default cap `2000`) and flushed **in FIFO order** on reconnect. When
the cap is exceeded the **oldest** fix is dropped (drop-head). Each fix carries
its own epoch-`timestamp`, so late/out-of-order delivery is fine server-side
(the realtime-engine writes per-fix — `mqtt.py` HSETs `vehicle:<id>:position`
per message). A process crash loses the in-memory buffer; SQLite-backed
persistence is a future hardening.

## Native permissions

This plugin requires background-location permissions declared by the app
shell (Agent A1). See **[`app/NATIVE-PERMISSIONS.md`](../../NATIVE-PERMISSIONS.md)**
for the exact manifest/plist entries. Summary:

- **Android** — `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`,
  `ACCESS_BACKGROUND_LOCATION` (Android 10+, separate runtime prompt),
  `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` (Android 14+, typed),
  `POST_NOTIFICATIONS` (Android 13+). The plugin declares its own
  `<service android:foregroundServiceType="location">` in
  `android/src/main/AndroidManifest.xml`.
- **iOS** — `NSLocationWhenInUseUsageDescription`,
  `NSLocationAlwaysAndWhenInUseUsageDescription`, and
  `UIBackgroundModes: ["location"]` in `Info.plist`; enable
  *Background Modes → Location updates* in Xcode.

## Manual device-test steps (milestone M-native)

These are the acceptance tests for the native runtime; the toolchain to
compile native code may not run in CI, so correctness is verified on a device.

1. **Build & install** the app on a physical Android and iOS device
   (`npx cap run android` / `npx cap run ios`) with `plugins.DatabusTelemetry`
   configured (brokerHost = the staging telemetry broker).
2. **TCP+TLS connect (R5):** start a run. The `status` ref goes
   `starting → streaming`. Confirm the broker sees the MQTT subscription
   (`transit/vehicle/<id>/position`) and the run advances
   `Confirmed → Tracking → In Progress` server-side — over **8883, not WS**.
3. **Background / locked publishing (R6):** pocket/lock the phone mid-run.
   Confirm the Android foreground notification stays visible and fixes keep
   arriving; on iOS confirm background-location updates continue. The run must
   not stall.
4. **Airplane-mode store-and-forward (R7):** enable airplane mode mid-run.
   `status` → `buffering`, `queuedCount` climbs. Disable airplane mode — the
   buffer flushes in order, `queuedCount → 0`, `status → streaming`, and the
   server advances the run from the buffered fixes.
5. **Clean `stop()`:** end the run. Confirm the Android foreground service
   notification is dismissed, GPS is released (no location icon), and there is
   no residual battery drain. `status → idle`. Call `stop()` twice — it must
   be idempotent (no crash, no residual service).

## Architecture

```
TS adapter (nativeRuntime.ts)
  └─ DatabusTelemetry plugin (registerPlugin)  ── Capacitor bridge ──┐
                                                                      │
Android (Kotlin)                              iOS (Swift)             │
  TelemetryController (singleton)               DatabusTelemetry       │
   ├─ TelemetryService (foreground FGS)          ├─ CLLocationManager  │
   └─ TelemetryEngine                            └─ CocoaMQTT          │
        ├─ GpsProvider (FusedLocation)                └─ Buffer        │
        ├─ MqttPublisher (HiveMQ, TLS 8883)                           │
        └─ PositionBuffer (drop-head ring)                            │
```

Native source:
- Android: `android/src/main/kotlin/org/simovi/databus/telemetry/`
  (`DatabusTelemetryPlugin`, `TelemetryController`, `TelemetryService`,
  `TelemetryEngine`, `MqttPublisher`, `GpsProvider`, `PositionBuffer`,
  `TelemetryConfig`).
- iOS: `ios/Sources/DatabusTelemetryPlugin/`
  (`DatabusTelemetryPlugin.swift`, `DatabusTelemetry.swift`).

## Asks for the databus/ops team

- **Broker TLS trust chain (R5):** the CA certificate / trust chain for the
  production telemetry broker (`:8883`), and whether it must be pinned via
  `caCertAsset` or can rely on the OS trust store.
- **R5 auth scheme:** username+token vs. MQTT client certificate, and how the
  credential lifecycle is provisioned to the device (the `username`/`token`
  start-option surface is ready; the scheme and provisioning are not).
- **Staging broker host** for the M-native device test (to set in
  `capacitor.config.ts`).
