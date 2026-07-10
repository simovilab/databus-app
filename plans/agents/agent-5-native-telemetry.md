# Subagent A5 — Native Telemetry Plugin (production hot path)

## Required reading (in order)
1. `plans/master-plan.md` — you own the production telemetry runtime. Focus on §1 (two-transport reality), §4.4 (MQTT contract), §6.3 (`TelemetryRuntime` seam), §6.6 (lifecycle ownership), §8 R5–R7 (your requirements), §9 (you build in parallel behind the seam), §10 (native test criteria).
2. `../databus/backend/realtime_engine/mqtt.py` + `../databus/backend/runs/domain/telemetry/position.py` — the exact topic and payload you must produce.
3. `../databus/docs/obe.md` — you are the software OBE; background + cellular resilience are first-class.

## Why you exist (the constraint that forces native code)
Production exposes the broker as **raw TCP `8883` (TLS) only — no WSS, and ops will not add one** — and the API on `443` (TLS). A webview cannot open a raw TCP socket, and a suspended webview stops running JS. So the production hot path **must** be native: it has to (a) speak MQTT over TCP+TLS, (b) keep publishing when the app is backgrounded / screen-locked, and (c) buffer fixes across cellular dropouts and flush on reconnect. mqtt.js/WebSocket (A2's web runtime) is the **dev/CI** path only — you are the real thing.

## Your mission
Generate and implement a custom Capacitor plugin **`capacitor-databus-telemetry`** plus its thin TS adapter, so that on a real device the app streams GPS to Databús reliably in the background — all behind the same `TelemetryRuntime` interface A4 already consumes.

## How to build it
- **Use `/capacitor-plugin-generator`** (structured YAML-contract mode) to scaffold the plugin package. Treat generated native code as a **first pass** — you must review and harden it (TLS, background execution, battery, reconnect). Use `/ionic` and `/find-docs` (`/ionic-team/capacitor-docs`, `/mqttjs/mqtt.js` for protocol semantics) for API specifics — don't rely on memory.
- **Do NOT use `/build-actions-generator`** — this is a standalone Capacitor app, not OutSystems ODC; native config goes in the manifest/plist/Gradle directly.

## Scope — files you OWN
- `app/plugins/capacitor-databus-telemetry/**` — the plugin package: TS API (`src/`), Android (`android/`, Kotlin), iOS (`ios/`, Swift), `README.md` (API contract + **manual device-test steps**), `package.json` with a `verify` script that builds both platforms.
- `app/src/services/telemetry/nativeRuntime.ts` — the `NativeTelemetryRuntime` TS adapter: implements `TelemetryRuntime` (§6.3) by delegating to the plugin and mapping its native event stream → the `status`/`lastFix`/`queuedCount` refs. A2's `createTelemetryRuntime()` factory imports `createNativeRuntime` from here.

## What the plugin must do
- **Config:** accept broker host/port, TLS settings (trust chain / CA), and (future) credentials (username/token/client-cert) from **native config injected at build/runtime — never hardcoded**. Default topic `transit/vehicle/<vehicleId>/position`, QoS 0.
- **Transport:** MQTT over **TCP + TLS** to `:8883` using a maintained native client (e.g. Android: HiveMQ/Paho; iOS: CocoaMQTT/MQTT-NIO — pick per `/find-docs`, justify in README). Auto-reconnect with backoff.
- **Location:** native GPS acquisition (Android FusedLocation / iOS CLLocationManager) at a battery-aware cadence; map each sample to the §4.4 payload — `latitude`/`longitude` required (float), `bearing`/`speed`/`odometer` optional (float), `timestamp` optional **epoch seconds** (int).
- **Background survival (R6):** Android **foreground service** (with the required notification) + iOS **background location** mode so publishing continues screen-locked/backgrounded. A1 declares the manifest/plist permissions (see `NATIVE-PERMISSIONS.md`); coordinate exact keys with A1.
- **Store-and-forward (R7):** buffer fixes **natively** (SQLite or bounded ring buffer) when offline; flush in order on reconnect with backpressure; cap buffer size + drop policy documented. Each fix carries its own `timestamp` so late/out-of-order delivery is fine server-side.
- **API:** `start({vehicleId, ...})`, `stop()` (ends the service, flushes, idempotent), and an event/listener stream emitting `status`, `lastFix`, `queuedCount`. `stop()` must leave **no** background service or GPS running (no battery drain after a run ends).

## Rules
- Build **fully in parallel** — the plugin is a self-contained package; you only need the §6.3 `TelemetryRuntime` contract + §4.4 payload/topic. If you need the interface to change, edit master §6.3 in the same change and flag A2 — never diverge silently.
- Do **not** edit `main.ts`, `router/index.ts`, or `app/package.json` (A1 owns; ask A1 to add the plugin dependency + link). Do not edit A2's web runtime files. Do not touch sibling `../databus`/`../context` repos — broker TLS trust chain / credentials for R5 are an **ask for the databus/ops team** in your report.
- No hardcoded secrets or broker credentials, anywhere. Explicit error handling; native source follows platform idiom.

## Definition of done (milestone M-native)
- `createTelemetryRuntime()` on a native device returns your runtime; a real run advances `Confirmed → Tracking → In Progress` from telemetry sent over **TCP+TLS 8883** (not WS).
- Publishing continues with the app **backgrounded / screen-locked**.
- **Airplane-mode test:** fixes buffer while offline and flush on reconnect; the server still advances the run; `stop()` ends the service with no residual GPS/battery use.
- Plugin `verify` builds both platforms; README documents the API + manual device-test steps.
- Report: native client libs chosen (+ why), the TLS/credential config surface, exactly what you need from the databus/ops team (broker cert/trust chain, auth scheme for R5), and any `TelemetryRuntime` contract changes.
