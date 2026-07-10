# Subagent A2 — Data Layer (types, API client, MQTT, geolocation, stores)

## Required reading (in order)
1. `plans/master-plan.md` — you are the **spine**. You own the implementations behind §6.1–6.3 and must honor the Databús contract in §4 exactly.
2. Verify the contract against the real backend (do not trust memory):
   - `../databus/backend/api/urls.py`, `api/views.py`, `api/serializers.py` (endpoints, request/response shapes, error envelope).
   - `../databus/backend/realtime_engine/mqtt.py` (MQTT topics + which leaves are accepted).
   - `../databus/backend/runs/domain/telemetry/position.py` (position payload field types).
   - `../databus/backend/runs/domain/lifecycle/{events,states}.py` (exact event/state strings).
   - `../context/behavior/databus/system/docs/run-lifecycle.md` (FSM + guards).

## Your mission
Build the **entire non-UI layer** so the feature agents can just call typed functions/stores. This is testable in isolation with Vitest and is where correctness lives.

## Scope — files you OWN
- `app/src/types/api.ts` — request/response interfaces for every endpoint in master §4.1–4.3 (Route, ShapeChoice, TripChoice, Vehicle, CreateRunInput, CreateRunResponse, RunStateResponse, LoginResponse, error envelope).
- `app/src/types/domain.ts` — **exactly** the shapes in master §6.1 (`RunState`, `Session`, `ActiveRun`, `Fix`).
- `app/src/services/apiClient.ts` — `apiGet`/`apiPost` per §6.3: base URL from `import.meta.env.VITE_API_BASE_URL`, inject `Authorization: Token <token>` from the auth store, and **normalize** the `{status:"error", step?, errors}` envelope into a thrown `ApiError {status, errors, step}`.
- `app/src/services/schedule.ts` — `getRoutes`, `getServiceToday(date?)`, `getWhichShapes(routeId)`, `findTrips(query)`, `getVehicles(company?)` per §6.3, mapping raw API JSON → the typed choices the UI needs.
- `app/src/services/telemetry/` — the telemetry runtime (master §6.3, §6.6). You own the **factory + web implementation**; A5 owns the native implementation.
  - `runtime.ts` — `createTelemetryRuntime()` returning a `TelemetryRuntime`. Select by platform: `Capacitor.isNativePlatform()` → `createNativeRuntime()` (imported from A5's `nativeRuntime.ts`; until A5 lands, import a stub that sets `status='error'` and logs "native runtime not linked" — **do not** fall back to WS on native), else → `createWebRuntime()`.
  - `webRuntime.ts` — composes `createPositionWatcher()` + `createTelemetryPublisher()` + an in-memory queue: on each `Fix`, publish to `transit/vehicle/<vehicleId>/position`; if disconnected, set `status='buffering'`, queue, and flush on reconnect. Drives `status`/`lastFix`/`queuedCount` refs.
  - `webPublisher.ts` — `createTelemetryPublisher(url?)` → `TelemetryPublisher` using **mqtt.js over WebSocket** (`VITE_MQTT_URL`; keep host+port+**path** fully config-driven — `/mqtt` being confirmed vs NanoMQ 0.24.9). QoS 0. Handle `connect`/`error`/`close` + `reconnectPeriod`; expose `connected`; **degrade gracefully** (never throw into the render path). Leave a `transformWsUrl` seam for future auth; no hardcoded creds.
  - **This is the dev/CI transport only.** Prod telemetry is A5's native TCP+TLS plugin — you never import raw TCP here.
- `app/src/services/geolocation.ts` — `createPositionWatcher()` returning a `PositionWatcher` (§6.3). Use `@capacitor/geolocation` `watchPosition({enableHighAccuracy:true}, cb)` on native and **fall back to `navigator.geolocation.watchPosition`** on web so v0 runs in the browser. Map each sample → `Fix` (lat/lon required; bearing/speed if present; `timestamp` = epoch **seconds**).
- `app/src/stores/auth.ts` — Pinia setup store per §6.2. `login()` calls `POST /login/`, stores `Session`, persists via `@capacitor/preferences` (JSON-encoded). `loadFromStorage()` rehydrates on boot. `logout()` clears store + storage.
- `app/src/stores/run.ts` — Pinia setup store per §6.2 + §6.6. Holds the `TelemetryRuntime` (`createTelemetryRuntime()`), exposed read-only as `telemetry`. `createRun(input)` = `POST /create-run/` → `POST /runs/<id>/update/ {event:"run_confirmed_by_operator"}` (confirm event is `run_confirmed_by_operator`, **not** `run_confirmed`) → store `ActiveRun` → **`telemetry.start({vehicleId})`**. `refreshState()` = `GET /runs/<id>/state/`. `endRun(event?)` = `POST /runs/<id>/update/` (default `run_completed`, R4 resolved; swappable to `run_interrupted`/`cancel_run`) → **`telemetry.stop()`**. The store — not any screen — owns telemetry lifecycle so it survives `RunProgress` unmounting / the phone locking.
- `app/tests/unit/**` — Vitest: apiClient error normalization, auth login/persist/logout, run create→confirm→state→end (mock fetch), telemetry payload shape (topic + JSON fields), geolocation web fallback. Target ≥80% on this layer.

## Rules
- Land **types + store/service skeletons early** (even returning stubs) so A3/A4 can import real symbols; then fill in implementations + tests.
- Keep exported signatures **exactly** as master §6 states. If a real backend shape forces a change, update `plans/master-plan.md` §6 in the same change and call it out loudly in your report so A3/A4 resync.
- Immutability (return new objects), explicit error handling, no hardcoded URLs/secrets (all via `import.meta.env`), files < 400 lines.
- Do **not** build UI/pages or edit `main.ts`/`router/index.ts`/`package.json` (A1 owns those — if you need a dep, note it for A1).
- **Skills (see master §3.2):** use `/find-docs` for `/mqttjs/mqtt.js` (browser ws connect + publish), `/ionic-team/capacitor-docs` (Geolocation/Preferences), `/vuejs/pinia` (setup stores) — verify APIs, don't guess. Use `/ionic` for how the Capacitor Geolocation/Preferences plugins integrate. **`/capacitor-plugin-generator` is not for v0** — we use the stock `@capacitor/*` plugins; only consider it (and flag it in your report first) if a custom native plugin (e.g. MQTT-over-TCP for prod native, R5/R6) genuinely becomes necessary. Never run `/build-actions-generator` (ODC-only, N/A here).

## Definition of done
- All §6 exports implemented + typed; Vitest green ≥80% on the data layer; `npm run build` passes.
- Report: any deviation from §4/§6, how you handled R1 (WS URL/path config + graceful degradation) and R3 (vehicle fallback), and confirmation that end-run defaults to `run_completed`.
