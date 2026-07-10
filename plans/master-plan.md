# Databús App — Master Plan (Vertical Slice v0)

> **Audience:** the subagents building the first working version of the Databús operator app, and any human reviewing their work.
> **Status:** authoritative build spec for the **Minimum Vertical Slice (MVS)**. Everything here is a contract — if an agent needs to deviate, it must say so explicitly in its report, not silently diverge.
> **Repo:** `databus-app` (this repo). **Sibling repos consulted:** `../databus` (the system) and `../context` (org reference layer).

---

## 1. What we are building and why

`databus-app` is the **operator / on-board client** for the Databús transit data system. In the system's own words it plays two roles at once:

1. **A mobile app** — an Ionic Vue + Capacitor UI that a bus driver/dispatcher uses to log in, start a run, watch it progress, and end it. It talks to the Databús **orchestrator REST API** over HTTP (the "warm path": sporadic events).
2. **An MQTT telemetry publisher** — while a run is active it streams the device's GPS position to the Databús **telemetry-broker** (NanoMQ) over MQTT (the "hot path": high-frequency updates). This is the software stand-in for the **On-Board Equipment (OBE)** described in `databus/docs/obe.md`.

> **Two transport realities — this drives the whole telemetry design (confirmed with the databus team 2026-07-10):**
> - **Local dev (web/browser):** MQTT over **WebSocket** (`ws://<broker>:8083/mqtt`). Fast to iterate; used for CI and the browser-validated flow.
> - **Production (real device):** the broker exposes **only raw TCP `8883` (TLS)** — **no WSS listener, and ops won't add one** — and the API is on **`443` (TLS)**. A webview cannot open a raw TCP socket, so **production telemetry must go through a custom native Capacitor plugin** that speaks MQTT over TCP+TLS. That native plugin must also (a) keep publishing when the app is **backgrounded / screen-locked** (a driver pockets the phone) via an Android **foreground service** / iOS **background location** mode, and (b) **buffer fixes natively and store-and-forward** across cellular dropouts. These are production requirements, not nice-to-haves. See §6.3 (telemetry interfaces), §8 (R5–R7), and **Agent A5**.

### How it fits the Databús architecture (verified against `../databus`)

```
   ┌─────────────────────┐        HTTP (REST)        ┌───────────────────────────┐
   │   databus-app        │  ───────────────────────▶ │ orchestrator (Django/DRF) │
   │  (THIS REPO)         │   login, create-run,      │  :8000/api/               │
   │                      │   confirm, state, end     └────────────┬──────────────┘
   │  Ionic Vue + Capac.  │                                        │ commands (FSM)
   │                      │  MQTT — dev: WS 8083 / prod: TCP+TLS 8883 (native)
   │                      │                                        ▼
   │  GPS → telemetry     │  ───────────────────────▶ ┌───────────────────────────┐
   └─────────────────────┘  transit/vehicle/<id>/     │ telemetry-broker (NanoMQ) │
                              position (JSON)          └────────────┬──────────────┘
                                                                    │ forwards
                                                                    ▼
                                                        realtime-engine (Celery)
                                                        → updates Redis state
                                                        → advances run lifecycle FSM
                                                        → schedule-engine builds GTFS-RT
```

The app is the **producer** at the edge. It never reads Redis, never touches RabbitMQ, never builds GTFS-RT. It **requests** run lifecycle changes via the API and **feeds** telemetry via MQTT; the server's `realtime-engine` does the reasoning (it auto-advances the run from `Confirmed → Tracking → In Progress` purely from the telemetry we publish).

### Reference source of truth

- System architecture: `../databus/ARCHITECTURE.md`, `../databus/README.md`, `../databus/MODEL.md`
- As-built system reference: `../context/reference/systems/databus.md` (**Last verified 2026-07-10**)
- Run lifecycle FSM (authoritative): `../context/behavior/databus/system/docs/run-lifecycle.md`
- API surface: `../databus/backend/api/urls.py`, `api/views.py`, `api/serializers.py`
- MQTT contract: `../databus/backend/realtime_engine/mqtt.py`, `../databus/backend/runs/domain/telemetry/position.py`
- Broker config: `../databus/telemetry-broker/nanomq.conf`

---

## 2. The Minimum Vertical Slice (MVS)

**One sentence:** *An operator logs in, starts a scheduled run, the device streams GPS over MQTT, the run advances through its lifecycle on the server, and the operator ends the run.*

This slice is deliberately the **thinnest path that touches every layer** (auth → REST → domain FSM → MQTT → device GPS). Everything in the SITEMAP that is not on this path (Messages, Alerts, history, settings, profile editing, occupancy, congestion) is **out of scope for v0** and explicitly deferred to §11.

### 2.1 End-to-end user flow

| # | Screen / action | Databús call | Result |
|---|---|---|---|
| 1 | **Splash** | — (read stored token) | Route to Login (no token) or Tabs (token present) |
| 2 | **Login** — username + password | `POST /api/login/` | Store `{token, operator_id, first_name, last_name}`; go to tabs |
| 3 | **Home** | — | Greet operator; show active-run status card if one exists |
| 4 | **Trips → Start run** (modal) | `GET /api/routes/` | Pick a route |
| 5 | … | `GET /api/service-today/` | Resolve `service_id` for today |
| 6 | … | `GET /api/which-shapes/?route_id=` | Pick direction/shape |
| 7 | … | `GET /api/find-trips/?route_id=&service_id=&shape_id=` | Pick trip by scheduled time |
| 8 | … choose vehicle | `GET /api/vehicle/` (or manual `vehicle_id` for v0) | Select vehicle |
| 9 | **Confirm** | `POST /api/create-run/` | `{run_id, run_lifecycle_state: "Initialized"}` |
| 10 | (immediately) | `POST /api/runs/<run_id>/update/` `{event:"run_confirmed_by_operator"}` | State → `Confirmed` |
| 11 | **Run Progress** — GPS watch starts | MQTT publish → `transit/vehicle/<vehicle_id>/position` | Server auto-advances `Confirmed → Tracking → In Progress` |
| 12 | (live) | `GET /api/runs/<run_id>/state/` every ~5 s | Display current lifecycle state |
| 13 | **End run** | `POST /api/runs/<run_id>/update/` `{event:"run_completed"}` | State → `Completed`; stop GPS + MQTT |
| 14 | **Profile → Logout** | — (clear token) | Back to Login |

### 2.2 Acceptance criteria (Definition of Done for v0)

There are **two milestones** (see §9); acceptance is split accordingly.

**M-web (browser-validated flow — A1–A4):**
1. Fresh install → login with seeded operator creds succeeds and persists across app restart.
2. Operator can create + confirm a run against a loaded GTFS feed; UI shows `Confirmed`.
3. With the app publishing GPS over the dev WS broker, the polled run state visibly advances to `Tracking` then `In Progress` **without any manual step** (proves the hot path end-to-end).
4. "End run" moves the run to a terminal state and tears down GPS + MQTT cleanly.
5. Runs on web (`vite`) against a local databus stack; nothing hard-blocks a native build.
6. Vitest data-layer tests pass; a Cypress smoke drives login → start → end with mocked API + MQTT.

**M-native (production telemetry runtime — adds A5):**
7. On a real device, telemetry connects to the broker over **TCP+TLS 8883** (not WS) via the native plugin and advances the run identically to M-web.
8. Publishing **continues with the app backgrounded / screen locked** (foreground service / background location).
9. **Store-and-forward:** with connectivity cut mid-run, fixes buffer natively and flush on reconnect; the server still advances the run. No unbounded battery drain; `stop()` ends the service.

---

## 3. Tech stack and the role each tool plays

| Tool | Package | Role in this app | Context7 ID (for `/find-docs`) |
|---|---|---|---|
| **Vue 3** | `vue` (Composition API, `<script setup lang="ts">`) | Reactive UI + component model | `/vuejs/docs` |
| **Ionic Vue** | `@ionic/vue`, `@ionic/vue-router` | All UI: pages, tabs, modals, inputs, lists | `/ionic-team/ionic-docs` |
| **Vue Router (Ionic)** | `@ionic/vue-router` | Splash → Login → Tabs navigation, route guards | `/ionic-team/ionic-docs` |
| **Pinia** | `pinia` *(ADD)* | App state: auth session, active run | `/vuejs/pinia` |
| **Capacitor** | `@capacitor/core`, `@capacitor/cli` | Native runtime bridge | `/ionic-team/capacitor-docs` |
| **Capacitor Geolocation** | `@capacitor/geolocation` *(ADD)* | `watchPosition` for continuous GPS | `/ionic-team/capacitor-docs` |
| **Capacitor Preferences** | `@capacitor/preferences` *(ADD)* | Persist auth token / operator | `/ionic-team/capacitor-docs` |
| **MQTT.js** | `mqtt` *(already added in git history)* | Publish telemetry over **WebSocket** | `/mqttjs/mqtt.js` |
| **Vite** | `vite` | Dev server + build | — |
| **Vitest** | `vitest` | Unit tests (data layer) | — |
| **Cypress** | `cypress` | E2E smoke test | — |
| **TypeScript** | `typescript`, `vue-tsc` | Types for API payloads + services | — |

**Dependencies to add:** `pinia`, `@capacitor/geolocation`, `@capacitor/preferences`. `mqtt` was added earlier (see commit `c1037b0`) — verify it is in `package.json` and reinstall if missing.

### 3.1 Documentation map — verified API notes (from `/find-docs` this session)

**Ionic Vue (`/ionic-team/ionic-docs`)** — components imported from `@ionic/vue`, icons from `ionicons/icons`. Tabs use `<ion-tabs>` + `<ion-tab-bar slot="bottom">` + `<ion-tab-button>`; each page is wrapped in `<ion-page><ion-header><ion-toolbar>…</ion-header><ion-content>…</ion-content></ion-page>`. The existing scaffold already uses the **router-based** tabs pattern (`TabsPage.vue` + child routes) — keep that pattern. Modals: `IonModal` (component ref or controller); each edit space is a modal per the SITEMAP "reglas de uso".
→ *Goes in:* Agent 1 (shell/tabs), Agent 3 & 4 (page/modal internals).

**Capacitor Geolocation (`/ionic-team/capacitor-docs`)**
- `Geolocation.watchPosition(options, callback) => Promise<CallbackID>`; clear with `Geolocation.clearWatch({ id })`.
- `PositionOptions`: `enableHighAccuracy: true` (GPS), `timeout` (default 10000), `minimumUpdateInterval` (Android, default 5000).
- iOS needs `NSLocationWhenInUseUsageDescription` (+ `NSLocationAlwaysAndWhenInUseUsageDescription` for background) in `Info.plist`; Android needs `ACCESS_FINE_LOCATION`. **Web fallback:** `navigator.geolocation.watchPosition` — the service must abstract this so v0 works in the browser.
→ *Goes in:* Agent 2 (`services/geolocation.ts`).

**Capacitor Preferences (`/ionic-team/capacitor-docs`)** — `Preferences.set({key,value})`, `Preferences.get({key})→{value}`, `Preferences.remove({key})`. Values are strings → JSON-encode the session object.
→ *Goes in:* Agent 2 (`stores/auth.ts` persistence).

**MQTT.js (`/mqttjs/mqtt.js`)**
- `mqtt.connect(url, options)` — url scheme **must be `ws://` or `wss://`** in a webview (no raw TCP). e.g. `ws://localhost:8083/mqtt`.
- `client.publish(topic, message, { qos: 0, retain: false }, cb)`.
- `reconnectPeriod` (default 1000ms) for auto-reconnect; listen to `connect`, `error`, `close`.
- Prefer `await mqtt.connectAsync(url, opts)`.
→ *Goes in:* Agent 2 (`services/telemetry.ts`).

### 3.2 Skills the agents must use

Every agent has these Claude Code skills available. **Use them instead of relying on training memory** — Ionic/Capacitor APIs move.

| Skill | Invoke | When to use | Who |
|---|---|---|---|
| **find-docs** (Context7) | `/find-docs` | **Mandatory** for any library API/signature/config question — Ionic, Capacitor, MQTT.js, Vue, Pinia, Vue Router. Resolve the library, then query. Library IDs are in §3. | **All agents, always** before writing library-specific code |
| **ionic** | `/ionic` | Expert guidance on Ionic UI components, patterns, navigation, and Capacitor native integration. Use for anything UI/native-shell shaped. | **A1, A3, A4** (and A2 for the Capacitor plugin services) |
| **capacitor-plugin-generator** | `/capacitor-plugin-generator` | **ACTIVE — required for A5.** Scaffolds the custom native Capacitor plugin (`capacitor-databus-telemetry`) that speaks MQTT over **TCP+TLS 8883**, runs a background/foreground service, and does native store-and-forward. Prod telemetry cannot work without it (webviews have no raw TCP). A5 drives this skill in structured (YAML-contract) mode; treat its output as a **first pass** needing device testing + native review, not shippable code. | **A5** (primary) |
| **build-actions-generator** | `/build-actions-generator` | Generates **OutSystems Developer Cloud (ODC)** build-action JSON. This app is a **standalone Capacitor + Vite** project, **not** ODC, so build actions have **no effect** here — native permissions/config go straight into `AndroidManifest.xml` / `Info.plist` / Gradle (A1 + A5). Use **only** if the project is ever ported to ODC. **Not used now.** | none |

> Rule of thumb: **`/find-docs` and `/ionic` are everyday tools; `/capacitor-plugin-generator` is A5's core tool.** `/build-actions-generator` stays out unless SIMOVI moves this app onto OutSystems ODC — no agent should invent a reason to run it.

---

## 4. Integration contract with Databús (do not guess — this is verified)

### 4.1 REST API (base `http://localhost:8000/api/`)

Auth is **DRF TokenAuthentication**. After login, send `Authorization: Token <token>` on authenticated calls.

| Endpoint | Method | Body / Query | Response (200) |
|---|---|---|---|
| `/login/` | POST | `{username, password}` | `{token, operator_id, first_name, last_name}` (400 on bad creds) |
| `/routes/` | GET | — | GTFS routes (DRF list) |
| `/service-today/` | GET | `?date=YYYY-MM-DD` (optional) | `[{service_id}]` |
| `/which-shapes/` | GET | `?route_id=` | `[{shape_id, direction_id, shape_name, shape_desc, shape_from, shape_to}]` |
| `/find-trips/` | GET | `?route_id=&service_id=&shape_id=` (all required) | `[{trip_id, trip_time, run_lifecycle_state, direction_id, trip_headsign}]` |
| `/vehicle/` | GET | `?company=` (optional) | vehicles |
| `/create-run/` | POST | see §4.2 | `{status:"success", run_id, run_lifecycle_state:"Initialized"}` |
| `/runs/<run_id>/update/` | POST | `{event, details?}` | `{status:"success", run_lifecycle_state}` |
| `/runs/<run_id>/state/` | GET | — | `{status:"success", run_lifecycle_state}` |
| `/runs/<run_id>/history/` | GET | — | `{run_id, transitions:[…]}` |

**Error envelope:** custom endpoints return `{status:"error", step?, errors:{…}}` with 400/404/422/500. The data layer must normalize these.

### 4.2 `POST /api/create-run/` body (from `CreateRunSerializer`)

```json
{
  "vehicle_id": "string",
  "operator_id": "string",
  "route_id": "string",
  "trip_id": "string",
  "direction_id": 0,
  "shape_id": "string",
  "schedule_relationship": "SCHEDULED"
}
```
`schedule_relationship ∈ {SCHEDULED, ADDED, UNSCHEDULED, CANCELED, DUPLICATED, DELETED}`. For v0 use **`SCHEDULED`**. `operator_id` comes from the login response.

### 4.3 Run lifecycle events (for `/runs/<id>/update/`)

The app only ever fires **`backend`-emitted** events (the `realtime_engine` ones fire server-side from telemetry — the app must NOT send them). Relevant `event` values:

| App action | `event` value | Guard notes |
|---|---|---|
| Confirm run | `run_confirmed_by_operator` | none |
| Cancel before start | `cancel_run` | `details.actor_role` must authorize (dispatcher / own operator) |
| End normally | `run_completed` | **Supported for manual operator end** on `/update/` (confirmed by databus team 2026-07-10). The server can also derive completion from telemetry, but the app sending `run_completed` is an accepted path. |
| Interrupt | `run_interrupted` | authorized; generates a service alert (deferred UI) |
| Short-turn | `run_short_turned` | authorized + geometrically valid (deferred) |

`details` is flattened into the payload server-side, so pass `{event, details:{actor_role, reason, …}}`. **States** (strings the API returns): `Requested, Validated, Initialized, Confirmed, Tracking, In Progress, No Signal, Completed, Cancelled, Interrupted, Short Turned`.

> ✅ **Resolved (R4, 2026-07-10):** manual `run_completed` on `/update/` **is supported** — no backend change needed. v0 "End run" sends `{"event":"run_completed"}`. Keep `endRun(event?)` configurable anyway so `run_interrupted` / `cancel_run` remain available for later UI.

### 4.4 MQTT telemetry contract (verified against `realtime_engine/mqtt.py` + `telemetry/position.py`)

- **Broker & transport (differs by build):**

  | Environment | Client | Transport | Endpoint |
  |---|---|---|---|
  | **Local dev (web)** | mqtt.js | MQTT over **WebSocket** | `ws://<broker>:8083/mqtt` (WS listener being added; `/mqtt` path being confirmed vs NanoMQ 0.24.9 — keep full URL in `VITE_MQTT_URL`) |
  | **Production (native device)** | **native plugin (A5)** | MQTT over **TCP + TLS** | `mqtts://<mqtt-domain>:8883` — **no WSS in prod; raw TLS only** |

  A webview cannot open raw TCP, so **prod telemetry does not use mqtt.js** — it goes through the A5 native plugin. The web/WS path stays as the dev + CI harness. The **REST API is `https://<api-domain>` on `443` (TLS)** in prod (`http://localhost:8000/api` in dev).
- **Topic (publish):** `transit/vehicle/<vehicle_id>/position` (QoS 0). *(Occupancy `transit/vehicle/<vehicle_id>/occupancy` exists but is out of scope for v0.)*
- **Payload (JSON):**
  ```json
  { "latitude": 9.9363, "longitude": -84.0474, "bearing": 180.0, "speed": 8.3, "timestamp": 1720600000 }
  ```
  `latitude` + `longitude` **required** (floats); `bearing`, `speed`, `odometer` optional floats; `timestamp` optional Unix epoch **seconds** (int).
- **Server binding:** the realtime-engine **ignores telemetry until the run is server-bound** — i.e. after `create-run` → confirm succeeds — and it must use the **same `vehicle_id`**. Publishing before that is silently dropped.
- **Auth:** dev broker is anonymous — no credentials needed locally. Prod (`wss://`) will be authenticated; keep any future credential injection in the `transformWsUrl` hook, never hardcoded.

---

## 5. Repository / directory layout (target)

```
app/
  capacitor.config.ts          # (Agent 1) appId, GPS perms notes
  .env.example                 # (Agent 1) VITE_API_BASE_URL, VITE_MQTT_URL
  src/
    main.ts                    # (Agent 1) createApp + Pinia + router + IonicVue
    App.vue                    # (Agent 1) <ion-app><ion-router-outlet/>
    router/index.ts            # (Agent 1) splash, login, /tabs/{home,trips,profile} + guard
    theme/
      variables.css            # (Agent 1) Databús design tokens (brand palette)
      tokens.css               # (Agent 1) spacing/typography helpers (optional)
    types/
      api.ts                   # (Agent 2) all REST payload/response interfaces
      domain.ts                # (Agent 2) RunState enum, Session, ActiveRun, Telemetry
    services/
      apiClient.ts             # (Agent 2) fetch wrapper: baseURL, token header, envelope
      schedule.ts              # (Agent 2) routes/serviceToday/whichShapes/findTrips/vehicles
      telemetry.ts             # (Agent 2) MQTT connect/publish/stop (mqtt.js over ws)
      geolocation.ts           # (Agent 2) watch abstraction (Capacitor + web fallback)
    stores/
      auth.ts                  # (Agent 2) Pinia: session, login, logout, loadFromStorage
      run.ts                   # (Agent 2) Pinia: activeRun, create/confirm/pollState/end
    components/
      ui/                      # (Agent 1) AppLoading.vue, AppError.vue, EmptyState.vue
      trips/
        TripSetupModal.vue     # (Agent 4) route→shape→trip→vehicle picker
        RunProgress.vue        # (Agent 4) live state + GPS/MQTT publishing + end
    views/
      SplashPage.vue           # (Agent 3)
      LoginPage.vue            # (Agent 3)
      TabsPage.vue             # (Agent 1) tab bar shell
      HomePage.vue             # (Agent 3)
      TripsPage.vue            # (Agent 4) active-run switch: setup vs progress
      ProfilePage.vue          # (Agent 3) name + logout
  tests/
    unit/…                     # (Agents 2/3/4) Vitest
    e2e/…                      # (Agent 4) Cypress smoke
```

> The current `src/` is the stock Ionic tabs starter (`Tab1/2/3Page.vue`, `ExploreContainer.vue`). Agent 1 replaces the scaffold; the old `TabN` files are deleted once routes are migrated.

---

## 6. Shared contracts (the parallelization seam)

These interfaces are **frozen** so Agents 3 and 4 can build against them while Agent 2 implements. Agent 2 owns the implementations and may extend but not break these signatures. If a change is needed, it must be raised in the agent's report and reflected here first.

### 6.1 `types/domain.ts`

```ts
export type RunState =
  | 'Requested' | 'Validated' | 'Initialized' | 'Confirmed' | 'Tracking'
  | 'In Progress' | 'No Signal' | 'Completed' | 'Cancelled'
  | 'Interrupted' | 'Short Turned';

export interface Session {
  token: string;
  operatorId: string;
  firstName: string;
  lastName: string;
}

export interface ActiveRun {
  runId: string;
  vehicleId: string;
  routeId: string;
  tripId: string;
  directionId: number;
  shapeId: string;
  state: RunState;
}

export interface Fix {           // a single GPS sample
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp?: number;            // unix epoch seconds
}
```

### 6.2 Store signatures (Pinia, `setup` stores)

```ts
// stores/auth.ts
export const useAuthStore = defineStore('auth', () => {
  const session: Ref<Session | null>;
  const isAuthenticated: ComputedRef<boolean>;
  async function login(username: string, password: string): Promise<void>; // throws ApiError
  async function logout(): Promise<void>;
  async function loadFromStorage(): Promise<void>;
  return { session, isAuthenticated, login, logout, loadFromStorage };
});

// stores/run.ts
export const useRunStore = defineStore('run', () => {
  const activeRun: Ref<ActiveRun | null>;
  // createRun: POST create-run → POST update{run_confirmed_by_operator} → telemetryRuntime.start({vehicleId})
  async function createRun(input: CreateRunInput): Promise<void>;
  async function refreshState(): Promise<RunState>;                 // GET state
  // endRun: POST update{event} → telemetryRuntime.stop()
  async function endRun(event?: 'run_completed' | 'run_interrupted'): Promise<void>;
  const telemetry: TelemetryRuntime;                                // exposed read-only for UI (status/lastFix/queuedCount)
  return { activeRun, createRun, refreshState, endRun, telemetry };
});
```

### 6.3 Service signatures

```ts
// services/apiClient.ts
export class ApiError extends Error { status: number; errors?: unknown; step?: string; }
export function apiGet<T>(path: string, params?: Record<string,string>): Promise<T>;
export function apiPost<T>(path: string, body: unknown): Promise<T>;
// reads token from authStore; base URL from import.meta.env.VITE_API_BASE_URL

// services/schedule.ts
export function getRoutes(): Promise<Route[]>;
export function getServiceToday(date?: string): Promise<string[]>;         // service_ids
export function getWhichShapes(routeId: string): Promise<ShapeChoice[]>;
export function findTrips(q: FindTripsQuery): Promise<TripChoice[]>;
export function getVehicles(company?: string): Promise<Vehicle[]>;

// services/telemetry/runtime.ts
// THE seam A4 consumes. One interface, two implementations selected by platform.
// It owns the whole "acquire GPS → buffer → publish to transit/vehicle/<id>/position".
export type TelemetryStatus = 'idle' | 'starting' | 'streaming' | 'buffering' | 'error';
export interface TelemetryRuntime {
  start(cfg: { vehicleId: string }): Promise<void>; // begins GPS + publishing (foreground or background)
  stop(): Promise<void>;                             // stops GPS + publishing, flushes/cleans up
  readonly status: Ref<TelemetryStatus>;             // 'buffering' = offline, queuing locally
  readonly lastFix: Ref<Fix | null>;
  readonly queuedCount: Ref<number>;                 // fixes held in store-and-forward buffer
}
// Factory picks the implementation:
//   Capacitor.isNativePlatform() → NativeTelemetryRuntime (A5 plugin: TCP+TLS, background, buffer)
//   else                         → WebTelemetryRuntime     (A2: browser GPS + mqtt.js WS, in-mem queue)
export function createTelemetryRuntime(): TelemetryRuntime;

// --- Web implementation building blocks (A2 owns; used only by WebTelemetryRuntime) ---
// services/telemetry/webPublisher.ts  (mqtt.js over WebSocket)
export interface TelemetryPublisher {
  connect(): Promise<void>;
  publishPosition(vehicleId: string, fix: Fix): void;   // topic transit/vehicle/<id>/position
  disconnect(): Promise<void>;
  readonly connected: boolean;
}
export function createTelemetryPublisher(url?: string): TelemetryPublisher;

// services/geolocation.ts  (Capacitor Geolocation with browser fallback — foreground/web only)
export interface PositionWatcher {
  start(onFix: (fix: Fix) => void, onError?: (e: unknown) => void): Promise<void>;
  stop(): Promise<void>;
}
export function createPositionWatcher(): PositionWatcher;

// --- Native implementation (A5 owns) ---
// The native plugin exposes start/stop/config + an event stream of status/fix/queue.
// NativeTelemetryRuntime is a thin TS adapter mapping the plugin's events → the
// TelemetryRuntime interface above. Plugin API contract lives in A5's plugin README
// and MUST satisfy createTelemetryRuntime()'s expectations.
```

> **Why a runtime, not just a publisher:** background survival means GPS acquisition, buffering, and publishing all have to run in **native** code — JS in a suspended webview can't fire. So on native we can't have JS "watch position then publish"; the plugin owns the loop. `TelemetryRuntime` hides that: A4 calls `start({vehicleId})` on confirm and `stop()` on end, identically on web and native. The run store (§6.2) drives it — see §6.6.

### 6.4 Route names (Vue Router)

`/` (Splash) · `/login` · `/tabs/home` · `/tabs/trips` · `/tabs/profile`. A global guard redirects unauthenticated users to `/login` and authenticated users away from `/login`. Route names: `splash`, `login`, `home`, `trips`, `profile`.

### 6.5 Design tokens (Agent 1 publishes; others consume)

Brand color from the Databús logo, exposed as Ionic CSS variables in `theme/variables.css` (`--ion-color-primary`, etc.) plus a small set of `--app-*` tokens (spacing, radius). Shared UI components: `<AppLoading>`, `<AppError :error>`, `<EmptyState>`. Feature agents must use these rather than re-styling.

### 6.6 Telemetry lifecycle ownership (who calls what)

The telemetry runtime is bound to the run lifecycle, not to a screen:

- **Start:** immediately after `runStore.createRun()` reaches `Confirmed` (telemetry is ignored server-side before the run is bound), call `telemetryRuntime.start({ vehicleId })`.
- **Stop:** in `runStore.endRun()` (any terminal outcome) call `telemetryRuntime.stop()`.
- **Owner:** the **run store (A2)** holds the `TelemetryRuntime` instance and calls `start`/`stop` inside `createRun`/`endRun`, so background telemetry is not tied to `RunProgress` being mounted (critical: the driver may leave the screen or lock the phone). **A4's `RunProgress` only *reads*** `runtime.status`/`lastFix`/`queuedCount` for display; it must **not** own start/stop.
- On web, `stop()` must also tear down the mqtt.js connection + browser watch; on native, `stop()` ends the foreground service. Idempotent stop; safe on app resume.

---

## 7. Environment & config

`app/.env.example` (Agent 1) — **dev** (web/WS):
```
VITE_API_BASE_URL=http://localhost:8000/api          # prod: https://<api-domain>  (443 TLS)
VITE_MQTT_URL=ws://localhost:8083/mqtt               # dev web only; prod native uses mqtts://<mqtt-domain>:8883
```
- **Prod transport is native, not env-swappable web:** the WS URL is a dev/CI convenience. Production telemetry runs through the A5 native plugin over `mqtts://…:8883`; the plugin reads its broker host/port/TLS + (future) credentials from native config injected at build/runtime, **never hardcoded**. The REST base URL is env-driven for both (`https` + `443` in prod).
- Local databus stack: `cd ../databus && bash scripts/dev.sh`, then load GTFS: `docker compose -f compose.dev.yml exec orchestrator uv run python manage.py loaddata gtfs.json`, and create a superuser/operator for login.
- **CORS (resolved):** Django allows `http://localhost:8100`, `http://localhost:5173`, and `capacitor://localhost`. Auth is DRF Token, **no CSRF**. **Action:** if your dev server serves on a different origin/port, either configure Vite to use `5173`/`8100` or flag the actual origin to the databus team.

---

## 8. Critical decisions, risks & open questions

| ID | Item | Decision / action |
|---|---|---|
| **R1 — MQTT over WebSocket (DEV ONLY)** | A webview mqtt.js client cannot use raw TCP; dev needs a browser-reachable transport. | Dev WS listener `ws://<broker>:8083/mqtt` (backend in-flight; `/mqtt` path being confirmed vs NanoMQ 0.24.9). Keep the whole URL in `VITE_MQTT_URL`, degrade gracefully. **This is the dev/CI path only — prod does not use it** (see R5). |
| **R2 — CORS (RESOLVED)** | Django must allow the app origin for XHR. | Allowed: `http://localhost:8100`, `http://localhost:5173`, `capacitor://localhost`. DRF Token, no CSRF. Prod API on `https`/`443`. Serve dev on `5173`/`8100` or flag your origin. |
| **R3 — Vehicle selection** | `create-run` needs a real `vehicle_id` bound to a company/operator. | v0: fetch `/vehicle/` and let the operator pick; manual entry fallback if empty. The **same** id feeds the MQTT topic. |
| **R4 — Manual end-of-run event (RESOLVED)** | Is `run_completed` accepted on `/update/`? | **Yes** — no backend change. "End run" = `{"event":"run_completed"}`; `endRun(event?)` stays configurable. |
| **R5 — Prod telemetry is native TCP+TLS 8883 (DESIGN REQUIREMENT)** | Prod broker exposes **only** raw TCP `8883` (TLS); **ops will not add WSS**. Webviews can't do raw TCP. | **Custom native plugin (Agent A5)** speaks MQTT over TCP+TLS. Broker host/port/TLS trust + future auth (username/token/client-cert) come from native config, never hardcoded. mqtt.js/WS is dev-only. |
| **R6 — Background telemetry (IN SCOPE)** | Driver pockets/locks the phone; a suspended webview stops publishing. | A5 plugin keeps GPS + publishing alive via Android **foreground service** + iOS **background location** mode. Requires background-location perms (A1 declares; A5 uses). Foreground-only web path is fine for dev, not for prod. |
| **R7 — Store-and-forward over cellular gaps (IN SCOPE)** | Celular dropouts on-route lose fixes; battery matters. | A5 buffers fixes **natively** (e.g. SQLite/ring buffer) with backpressure + battery-aware cadence, and flushes on reconnect. Server tolerates out-of-order/late fixes (each carries its own epoch `timestamp`). Web path uses a best-effort in-memory queue only. |

**None of these block starting the build.** R1–R4 are resolved/in-flight. R5–R7 are now **committed design requirements owned by Agent A5** (native plugin), decoupled from the web-validated flow behind the `TelemetryRuntime` seam (§6.3) so A3/A4 are unaffected by which transport runs underneath.

---

## 9. Parallelization plan — 5 agents

Five agents work concurrently. The seam is §6 (frozen contracts). Agent 2 is the "spine"; A3/A4 code against its **interfaces** (with local mocks) while it implements; **A5 builds the native telemetry plugin behind the `TelemetryRuntime` seam** so it never blocks the web-validated flow.

| Agent | Scope | Owns (files) | Depends on |
|---|---|---|---|
| **A1 — Shell & Design System** | App boots, routes, tabs, theme, shared UI, deps, env, capacitor config + **native perms** | `main.ts`, `App.vue`, `router/index.ts`, `theme/*`, `views/TabsPage.vue`, `components/ui/*`, `capacitor.config.ts`, `.env.example`, `package.json` deps, `android/…/AndroidManifest.xml` + `ios/…/Info.plist` permission entries | §6.4, §6.5 |
| **A2 — Data Layer** | Types, API client, schedule, **web** telemetry (mqtt.js WS) + geolocation, `TelemetryRuntime` factory + web impl, Pinia stores + Vitest | `types/*`, `services/*`, `stores/*`, `tests/unit/**` | §4, §6.1–6.3, §6.6 |
| **A3 — Auth & Home** | Splash, Login, Home, Profile pages | `views/SplashPage.vue`, `LoginPage.vue`, `HomePage.vue`, `ProfilePage.vue` | A1 shell/tokens, A2 `useAuthStore` |
| **A4 — Trips (core vertical)** | Trip setup modal, run progress (reads `runStore.telemetry` status), Cypress smoke | `views/TripsPage.vue`, `components/trips/*`, `tests/e2e/*` | A1, A2 `useRunStore` + `schedule` |
| **A5 — Native Telemetry Plugin** | Custom Capacitor plugin: MQTT over **TCP+TLS 8883**, Android foreground service / iOS background location, native **store-and-forward** buffer, native GPS. Plus the `NativeTelemetryRuntime` TS adapter | `plugins/capacitor-databus-telemetry/**` (own package: `src/`, `android/`, `ios/`, `README.md`), `src/services/telemetry/nativeRuntime.ts` | §4.4 (MQTT contract), §6.3 `TelemetryRuntime`, §8 R5–R7 |

### Integration order (how they converge)

1. **A1 lands the shell first-ish** (routes + tabs + `main.ts` with Pinia + native perms) so the app compiles and everyone has mount points. Placeholders for `views/*Page.vue`.
2. **A2 lands types + store/service skeletons + the `createTelemetryRuntime()` factory early** (web impl real; native impl behind a stub that throws "native runtime not linked") so A3/A4 import real symbols.
3. **A3 & A4 build pages** against interfaces; temporary local mocks until A2 merges.
4. **A5 works fully in parallel** — a Capacitor plugin is a self-contained package; it needs only the §6.3 `TelemetryRuntime` contract + §4.4 MQTT payload/topic. It delivers `nativeRuntime.ts`; A2's factory switches to it when `Capacitor.isNativePlatform()`. A5 validates on a device/emulator, not in `vite dev`.
5. **Two converging milestones:** **M-web** = browser flow (A1–A4) green in CI with mqtt.js/WS; **M-native** = on-device run with background TCP+TLS telemetry + store-and-forward (adds A5). M-web can complete before M-native.

### Conflict-avoidance rules

- Each agent edits **only files it owns**. `main.ts`, `router/index.ts`, `package.json` are **A1-owned** — others note needed routes/deps in their report. **A5 registers its plugin dep** by asking A1 (don't edit `package.json`); A5's own plugin package files are exclusively A5's.
- The `TelemetryRuntime` interface (§6.3) is the A2↔A5 contract. If A5 needs a shape change, it updates §6.3 in the same change and flags A2 — neither silently diverges.
- No agent edits sibling `../databus` / `../context` repos. Broker/ops needs (e.g. TLS trust chain, broker credentials for R5) go in the report as "asks for the databus/ops team."
- Immutability & style per repo rules: `<script setup lang="ts">`, small files (<400 lines; native source follows platform idiom), explicit error handling, **no hardcoded secrets/broker creds**, no committed `.env`.

---

## 10. Testing & quality

- **Unit (Vitest, A2):** apiClient envelope/error normalization; auth store login/logout/persist; run store create→confirm→state→end; telemetry payload shape (topic + JSON); geolocation web fallback. Target ≥80% on the data layer.
- **Component (A3/A4):** login form validation/error display; trip setup happy path with mocked schedule service.
- **E2E (Cypress, A4):** smoke — login → start run → (mocked telemetry advances state) → end run. Mock the API + MQTT so it runs in CI without the databus stack.
- **Native (A5):** on device/emulator — connects to broker over TCP+TLS; publishes continues with screen locked / app backgrounded; **airplane-mode test** buffers fixes and flushes them (in order-tolerant) on reconnect; `stop()` ends the foreground service cleanly (no battery drain after run end). These cannot run in `vite dev` — A5 documents the manual device test steps in its plugin README.
- **Lint/build:** `npm run lint` and `npm run build` (vue-tsc) must pass before any agent reports done; A5's plugin builds for both platforms (`npm run verify` in the plugin package).

## 11. Explicitly out of scope for v0 (deferred, but design must not preclude)

Messages/chat, Alerts (active alerts, service-alert creation UI), trip history + details, occupancy/congestion telemetry, profile/settings editing modals, multi-tenant profile switching, institutional (LDAP/Apple/Google) auth, i18n, app-store submission. The SITEMAP's full tab set (Home/Trips/Messages/Profile with segments/modals) is the **north star**; v0 ships Home/Trips/Profile with only the run path live.

> **Now IN scope (moved out of "deferred"):** background telemetry, native TCP+TLS MQTT, and store-and-forward buffering — these are production requirements delivered by Agent A5 (R5–R7). They land in milestone **M-native**; the browser flow (**M-web**) does not depend on them.

---

## 12. How to run the whole thing locally (once built)

```bash
# 1. Databús backend
cd ../databus && bash scripts/dev.sh
docker compose -f compose.dev.yml exec orchestrator uv run python manage.py loaddata gtfs.json
docker compose -f compose.dev.yml exec orchestrator uv run python manage.py createsuperuser
#   (ensure the user has an Operator + a Vehicle exists; dev MQTT WS listener at ws://<broker>:8083/mqtt — Risk R1, backend in-flight)

# 2. The app — M-web (browser, dev WS transport)
cd ../databus-app/app
cp .env.example .env    # point VITE_MQTT_URL at the ws listener
npm install
npm run dev             # open the printed URL, log in, start a run

# 3. The app — M-native (real device, TCP+TLS background telemetry via A5 plugin)
npm install ./plugins/capacitor-databus-telemetry   # or workspace-linked
npx cap add android && npx cap add ios              # applies native permissions (A1's NATIVE-PERMISSIONS.md)
npx cap sync
npx cap run android   # or: npx cap run ios — test background + airplane-mode store-and-forward on a device
```
