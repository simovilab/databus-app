# Databús ↔ App — Integration Contract & Open Asks

This document describes how **`databus-app`** (the operator/on-board client)
integrates with the **`databus`** backend, and lists the concrete backend
changes the app needs. It is written to be handed to a **Databús backend agent**:
the [Asks for the Databús team](#asks-for-the-databús-team) section is the
actionable checklist; everything above it is the context that justifies each ask.

> Paths below are relative to the `databus` repo (e.g.
> `backend/api/views.py`). "The app" means this `databus-app` repo.

---

## 1. What the app uses today

All endpoints are under `/api/`. Auth is DRF **TokenAuthentication**
(`Authorization: Token <token>`), obtained from `POST /api/login/`.

### Warm path (REST)

| Purpose | Method & path | Notes |
|---|---|---|
| Login | `POST /login/` | `{username, password}` → `{token, operator_id, first_name, last_name}` |
| List routes | `GET /routes/` | GTFS routes for the current feed |
| **List trips for a route** | `GET /trips/?route_id=` | `TripViewSet`, filterable by `route_id`. Each trip carries `direction_id` + `shape_id` — this is the app's source of truth for the run wizard. |
| List vehicles | `GET /vehicle/` | see [§3 vehicle id](#3-vehicle-serializer-omits-id) |
| Create run | `POST /create-run/` | body below |
| Confirm / end / cancel run | `POST /runs/<id>/update/` | `{event, details}` |
| Poll run state | `GET /runs/<id>/state/` | 404 when the run doesn't exist |
| Run FSM timeline | `GET /runs/<id>/history/` | ordered transitions (run-details modal) |

`create-run` body:

```json
{
  "vehicle_id": "veh-001",
  "operator_id": "op-demo",
  "route_id": "bUCR_L1",
  "trip_id": "desde_artes_sin_milla_entresemana_08:35",
  "direction_id": 0,
  "shape_id": "desde_artes_sin_milla",
  "schedule_relationship": "SCHEDULED"
}
```

### Hot path (MQTT telemetry)

- Topic: `transit/vehicle/<vehicle_id>/position`, QoS 0.
- Payload: `{ latitude, longitude, bearing?, speed?, odometer?, timestamp? }`
  (`latitude`/`longitude` required floats; `timestamp` epoch seconds).
- Telemetry is ignored server-side until the run is bound (create-run → confirm).

---

## 2. Run lifecycle — how the app drives the FSM

Verified against `backend/runs/domain/lifecycle/{transitions,guards,events}.py`.

```
create-run ─────▶ REQUESTED → VALIDATED → INITIALIZED     (POST /create-run/)
confirm ────────▶ INITIALIZED → CONFIRMED                  {event: run_confirmed_by_operator}
  (server, from telemetry) CONFIRMED → TRACKING → IN_PROGRESS
operator ends ──▶ CONFIRMED/TRACKING → CANCELLED           {event: cancel_run,      details:{actor_role:"operator"}}
             └──▶ IN_PROGRESS/NO_SIGNAL → INTERRUPTED       {event: run_interrupted, details:{actor_role:"operator"}}
  (server, at terminal stop) IN_PROGRESS → COMPLETED        {event: run_completed}   ← system only
```

**Rules the app now follows** (each was a bug we hit and fixed on the app side):

1. **`run_completed` is system-only.** Its guard `is_at_terminal_stop` requires a
   `stop_id` equal to the trip's terminal stop; the realtime engine fires it. The
   app must never send it — doing so returns **422**. The operator's "End run"
   sends `run_interrupted` or `cancel_run` instead, chosen from the current
   state, both with `details.actor_role="operator"`.

2. **One active run per operator/vehicle/trip.** `update_system_state` writes
   `operator:<id>:current_run` / `vehicle:<id>:current_run` /
   `trip:<id>:current_run` at INITIALIZE, released by `release_resources` only on
   a terminal transition. A second `create-run` for a still-bound operator fails
   validation with e.g. `"Operator 'op-demo' is already assigned to run <id>"`.
   The app surfaces this message verbatim.

3. **A GTFS trip is the route+direction+shape bundle.** The app lists trips from
   `GET /trips/?route_id=` and reads `direction_id`/`shape_id` off the chosen
   trip. It does **not** use `which-shapes` / `service-today` / `find-trips`
   (see [§4](#4-discovery-endpoints-depend-on-empty-tables)).

---

## 3. Vehicle serializer omits `id`

`VehicleSerializer` is a `HyperlinkedModelSerializer`, so `GET /vehicle/` returns
`url` (`…/vehicle/<id>/`) but **no `id` field** — even though `id` *is* the
vehicle PK and the `vehicle_id` `create-run` needs. The app **works around this**
by parsing the id out of the `url` tail. It would be cleaner for the serializer
to expose `id` explicitly. *(Workaround is in place; this is a nice-to-have.)*

---

## 4. Discovery endpoints depend on empty tables

`which-shapes`, `service-today`, and `find-trips` were the originally-intended
run-setup chain, but in the current dev data they don't work:

- `which-shapes` reads the **`RouteStop`** table, which the GTFS loader leaves
  **empty (0 rows)**, and queries `GeoShape.direction_id`, a field that does not
  exist on `GeoShape` (it lives on `Trip`/`RouteStop`) → `FieldError`.
- `find-trips` reads **`TripTime`**, also **empty (0 rows)**.
- `service-today` reads **`CalendarDate`** (empty) then falls back to `Calendar`.

The app **sidesteps all three** by driving the wizard from `GET /trips/?route_id=`
(fully populated: 123 trips for `bUCR_L1`), which is sufficient today. These
endpoints only need fixing if the backend wants them to be the canonical path —
noted as a lower-priority ask below.

---

## 5. Dev vs prod transport (TLS/TCP)

**This is the most important operational note for the backend/ops team.** The
app deliberately uses different transports per environment:

| | **Development** | **Production** |
|---|---|---|
| **API** | `http://localhost:8000`, reached via the app's **Vite dev proxy** at `/api` — this exists purely to **sidestep CORS**, because the backend has **no `django-cors-headers`** configured for the dev origin. | `https://<api-domain>` on **443 / TLS**. |
| **Telemetry** | **MQTT over WebSocket** (`ws://…:8083/mqtt`), via mqtt.js in the browser. | **raw MQTT over TCP + TLS** on **8883**, via the native Capacitor plugin. Prod exposes **no** WebSocket listener. |
| **Client runtime** | web runtime (browser GPS, in-memory queue) | native runtime (background location, native store-and-forward) |

Consequences the backend/ops team must plan for:

- The **prod telemetry path is TCP+TLS on 8883 only** — it can be validated
  **only** on a native device build, never in a browser. The app's native plugin
  needs: the broker **host**, the **TLS trust chain** (CA / cert pinning
  decision), and the **auth scheme** (username/password, token, or client cert).
- The API must be reachable over **HTTPS/443**. If the web build is ever shipped
  (PWA), the backend will also need **CORS** so the app can drop the dev proxy.

---

## 6. NavSat telemetry via `navsat-bridge` — the chosen Plan B hot path

> Verified against `../navsat-bridge` (README, `src/navsat_bridge/{transforms,models,sinks/mqtt}.py`),
> `../databus/backend/realtime_engine/mqtt.py`, `runs/domain/telemetry/keys.py`,
> and `../databus` branch `feat/fetch-telemetry` (commit `c5ef42b`).

**Under Plan B, live positions come from NavSat — the fleet's existing AVL
provider — not from operator phones.** The `navsat-bridge` service *is* the
adapter: it polls NavSat's last-state API and republishes onto the canonical
databus MQTT contract, so **databus needs no in-backend adapter for NavSat.**

```
NavSat last-state API ──poll(10s)──▶ navsat-bridge ──▶ S3 Parquet archive (always)
                                                   └──▶ databus MQTT broker (optional sink)
```

The bridge publishes `transit/vehicle/<id>/position`, QoS 0, retain false, with
units converted (km/h→m/s, km→m, local `crDateTime`→epoch s) — exactly §1's hot
path contract.

**The app stays warm-path-only by default, but keeps its own telemetry as an
easily-enabled option.** Because NavSat covers positions, the web build never
starts a publisher, and `telemetry.start()` is already fire-and-forget so nothing
breaks. **The telemetry seam is retained on purpose** (web runtime + native
runtime + MQTT publisher, `app/src/services/telemetry/`): a `databus-app` instance
can *also* transmit GPS when wanted, with no re-architecture — enable the publisher
and point it at a broker listener. **Do not remove this seam.** (Browser
self-transmit would additionally need a **WSS** MQTT listener exposed in prod —
see §5; prod exposes none today.)

### ✅ Vehicle identity: string PK == plate (convention holds → bridge just works)

> **Corrected** after checking `operations/models.py` + the seed fixtures. An
> earlier draft of this section claimed a *numeric* PK and a guaranteed mismatch —
> that was wrong.

`Vehicle` uses a **string primary key**, not an auto integer:

```python
class Vehicle(models.Model):
    id = models.CharField(max_length=100, primary_key=True)   # operations/models.py
    license_plate = models.CharField(max_length=31)
```

and the seed sets the PK **equal to the plate** — fixture vehicles are
`id == license_plate` (`"SJB1234"`, `"SJB5678"`;
`operations/fixtures/operations.json`). So the identifiers line up end to end:

| Producer / consumer | key | value |
|---|---|---|
| app `create-run` `vehicle_id` (url-tail of `/vehicle/<id>/`) | `Vehicle.id` | `SJB1234` |
| Redis binding at INITIALIZE | `vehicle:<id>:current_run` | `vehicle:SJB1234:current_run` |
| `navsat-bridge` publish topic (`plateNumber`) | plate | `transit/vehicle/SJB1234/position` |
| ingestion lookup (`realtime_engine/mqtt.py`) | topic id | `vehicle:SJB1234:current_run` ✅ |
| app self-transmit (if enabled), topic `vehicle_id`=id | `Vehicle.id` | `transit/vehicle/SJB1234/position` ✅ |

**So there is no inherent mismatch.** Because the PK *is* the plate, the bridge, a
self-transmitting app, and ingestion all key on the same string — NavSat telemetry
lands with **no code change**, and the bridge and app are automatically consistent.

**The one real dependency is an operational convention, not code:** every `Vehicle`
must be registered with `id == its NavSat plateNumber`. If a vehicle is ever created
with `id ≠ plate` (e.g. an internal fleet number), its telemetry silently drops. So
the ask (P1) shrinks to *confirm/enforce that convention* — optionally with a
plate→id fallback lookup in ingestion for divergent records.

### Required — generalized in-backend HTTP adapters (test alongside the bridge)

**Both telemetry paths are in scope and must be tested:** (a) `navsat-bridge`
(external service → MQTT), and (b) generalized **in-backend HTTP adapters** that
pull from arbitrary HTTP APIs. `databus` branch `feat/fetch-telemetry`
(commit `c5ef42b`) is the **sketch** of (b): per-`Vehicle` fields
(`position_source_type` ∈ {`mqtt`,`http`,`both`}, `position_source_url`,
`position_source_paths` — a declarative field-map) + a Celery task that walks
`runs:in_progress`, fetches each source, and republishes to MQTT **by id**.

To reach a testable state it must handle what the sketch does not: **auth**
(headers / OAuth / signed URLs, not just a tokened URL), **response shape** (array /
nested / XML / protobuf; "find the element where plate==X"), **unit transforms**
(the bridge's km/h→m/s etc.), and **fetch granularity** (a fleet endpoint returns
*all* vehicles in one call — don't re-fetch it N times per vehicle). Plus two
outright bugs: the republish topic is `vehicle/<id>/position` but ingestion
subscribes to **`transit/vehicle/+/position`** (missing `transit/` prefix → nothing
lands); and `elif type=="both"` is dead code nested under `if type=="mqtt"`.
Publishing by id is correct given the id==plate convention above — just keep the
bridge and the adapter from **double-publishing** the same vehicle.

---

## 7. Deployment & reverse proxy — the "Plan B" web app

> Verified against `../databus/compose.prod.yml` and `.env` domain values.

**A production reverse proxy already exists in config: Traefik.** `compose.prod.yml`
is a complete prod topology — every HTTP service carries `traefik.*` labels,
TLS via a **Let's Encrypt** cert resolver, and a security-headers/rate-limit/
compression middleware chain. MQTT TLS on **8883** is a Traefik **TCP** router
(`HostSNI` + `tls`) forwarding to NanoMQ `:1883`. Traefik itself runs outside the
compose (network `traefik_proxy` is `external: true`).

**Configured prod domains (in `../databus/.env`) — note the naming:**

| Env var | Value | Serves |
|---|---|---|
| `ORCHESTRATOR_DOMAIN` | `api.databus.simovilab.com` | Django API |
| `UI_DOMAIN` | `databus.simovilab.com` | **Nuxt** frontend (`user-interface`) |
| `MQTT_DOMAIN` | `mqtt.databus.simovilab.com` | MQTT over TLS :8883 |

Two facts that shape the Plan B plan:

- **DNS reality — the live zone is `simovilab.org` (GoDaddy), while the backend
  config points at `simovilab.com` (not resolving).** The `.com` names in the
  table (`api.databus.simovilab.com`, …) are **NXDOMAIN**: the prod stack is
  configured but not deployed. In the live **`.org`** zone (nameservers
  `ns5*.domaincontrol.com` = GoDaddy): **`databus.simovilab.org` is already live —
  a GitHub Pages docs site** (served from `185.199.108.153` / `2606:50c0::`, valid
  Let's Encrypt cert) → **do not repoint it**. `app.databus.simovilab.org` and
  `api.databus.simovilab.org` are **NXDOMAIN and free to create**. The
  `app.databus.ucr.ac.cr` name discussed verbally matches neither config nor DNS.
  **`.com` vs `.org` (and the `…ucr.ac.cr` idea) is an open naming decision.**
- **`compose.prod.yml` has no service for *this* app.** `user-interface` is the
  separate Nuxt UI. Serving the Ionic operator app at e.g.
  `app.databus.simovilab.com` means **adding a new service** (static `nginx`
  serving the built `dist/`) with its own Traefik router.

**Good news — same-origin needs zero app/backend change.** `apiClient.getBaseUrl()`
resolves a relative `VITE_API_BASE_URL=/api` against `window.location.origin`. So
if the app is served at `app.databus.simovilab.com` and its Traefik router also
routes `/api` on that host to the orchestrator, every API call is **same-origin**
— **no `django-cors-headers` needed**, exactly reproducing the dev Vite-proxy
trick in prod. (CORS only becomes necessary if the app is served from a *different*
origin than the API.) Practical consequence: HTTPS testing needs only **one** new
DNS record (`app.databus.simovilab.org → host`) — the API rides the same host under
`/api`, so no separate api domain is required, sidestepping the `.com`/`.org` split.

---

## Asks for the Databús team

Actionable items, roughly in priority order. Each notes whether the app is
currently **blocked** or has a **workaround**.

### Plan B enablement (active) — web app at a real domain + NavSat telemetry

These unblock the "test on real devices over HTTPS without app-store approval"
plan (see §6–§7).

- **P1 — Confirm/enforce the `Vehicle.id == plateNumber` convention.** *(Not a
  blocker if the convention holds — see §6.)* The `Vehicle` PK is a **string** and
  the seed sets it to the plate, so the bridge's plate topic already matches the run
  binding and NavSat telemetry lands with no code change. Ensure vehicle
  registration keeps `id == NavSat plateNumber`; optionally add a plate→id fallback
  in `realtime_engine/mqtt.py` for divergent records. *(Supersedes the earlier
  "reconcile plate vs PK" framing, which assumed a numeric PK.)*
- **P4 — Bring the in-backend HTTP adapter to a testable state (must-do).** Both
  telemetry paths are required — the NavSat **bridge** *and* generalized **in-backend
  HTTP adapters** (§6). On `feat/fetch-telemetry`, fix the auth / response-shape /
  units / fetch-granularity gaps and the two topic/dead-code bugs so a run can be
  driven end-to-end by **either** path, without the two double-publishing a vehicle.
- **P2 — Serve the operator app + a same-origin `/api` route.** *(App
  workaround for local testing: HTTPS tunnel / VPS, see `deploy/VPS_HTTPS_TESTING.md`.)*
  Add an `nginx` service serving this app's built `dist/`, with a Traefik router
  for the app host that **also** routes `/api` on that host to `orchestrator:8000`.
  Same-origin ⇒ no CORS needed (§7). App side ships a `.env.production` with
  `VITE_API_BASE_URL=/api`.
- **P3 — DNS + domain naming.** *(One record unblocks testing.)* The live zone is
  `simovilab.org` at GoDaddy; the config's `simovilab.com` names are not up. For
  HTTPS testing, add a single **A/AAAA** record `app.databus.simovilab.org →
  <host public IP>`; same-origin `/api` means **no separate api record is needed**.
  Do **not** repoint `databus.simovilab.org` (live GitHub Pages docs). Separately,
  settle `.com` vs `.org` (and the `…ucr.ac.cr` idea) as the canonical base for
  real prod.

### High priority

1. **Operator "current active run" endpoint.** *(App workaround: none — this is
   the main functional gap.)*
   The Redis binding `operator:<id>:current_run` already exists, but there is no
   REST way to read it. The app cannot resume an in-progress run after a
   restart/refresh without it.
   *Proposed:* `GET /api/operator/<operator_id>/current-run/` (or
   `GET /api/runs/current/` scoped to the authenticated operator) returning the
   run id + `run_lifecycle_state` + the run's route/trip/direction/shape/vehicle,
   or `204/404` when none.

2. **Run-list / run-history endpoint.** *(App workaround: client-side history in
   Preferences, reconciled via `GET /runs/<id>/state/`.)*
   The DRF run ViewSet is commented out (`backend/api/urls.py:15`
   `# router.register(r"run", views.RunViewSet)`). A read endpoint filterable by
   operator and date would let history be authoritative instead of device-local.
   *Proposed:* re-enable a **read-only** `RunViewSet` with
   `filterset_fields = ["operator", "start_date", "run_lifecycle_state"]`, or a
   dedicated `GET /api/runs/?operator=&date=`.

3. **Cancel-from-`Initialized` transition.** *(App workaround: none — such runs
   are unreleasable via the API.)*
   The FSM has no `cancel_run` transition from `INITIALIZED`, only from
   `CONFIRMED`/`TRACKING`. A run that is created but never confirmed (e.g. the app
   dies between create and confirm) stays bound to its operator forever.
   *Proposed:* add `INITIALIZED --cancel_run--> CANCELLED` with
   `is_cancellation_authorized` + `release_resources`.

### Medium priority (prod enablement — ops)

4. **Native telemetry broker config.** Provide the **staging/prod broker host**
   for `mqtts://<host>:8883`, the **TLS trust chain** (CA bundle or pinning
   decision), and the **auth scheme** for publishers. The app injects credentials
   per-call and never commits them; `app/capacitor.config.ts` currently has a
   `brokerHost: 'mqtt.example.com'` placeholder.

5. **CORS for the web build (optional).** If the browser/PWA build is to talk to
   the API directly (without the dev proxy), configure `django-cors-headers` for
   the app origin(s).

### Low priority (nice-to-have)

6. **Expose `id` on `VehicleSerializer`.** Add `id` to the fields so clients
   don't have to parse it from `url`. *(App has a workaround.)*

7. **Fix or retire the discovery endpoints.** `which-shapes` / `find-trips` /
   `service-today` depend on empty/mismodeled tables
   (`RouteStop`, `TripTime`, `CalendarDate`; `GeoShape.direction_id` doesn't
   exist). Either populate those in the GTFS loader and fix the field references,
   or retire the endpoints in favor of `GET /trips/`. *(App doesn't use them.)*

8. *(Moved up)* The telemetry-adapter work — **both** the NavSat bridge and the
   generalized in-backend HTTP adapter — is now a **must-do**: see **P4** under
   [Plan B enablement](#plan-b-enablement-active--web-app-at-a-real-domain--navsat-telemetry).

---

## Appendix — verification pointers

Facts above were verified against these files in the `databus` repo:

- `backend/api/urls.py` — routes (note the commented-out `run` ViewSet).
- `backend/api/views.py` — `CreateRunViewSet`, `RunUpdateViewSet`,
  `RunStateViewSet`, `RunHistoryView`, `TripViewSet`, `VehicleSerializer`,
  `WhichShapesView`, `FindTripsView`, `ServiceTodayView`.
- `backend/runs/domain/lifecycle/{transitions,guards,events}.py` — the FSM,
  guards (`is_at_terminal_stop`, `is_operator_available`, …), and event names.
- `backend/runs/domain/lifecycle/actions.py` — `update_system_state` /
  `release_resources` (the `*:current_run` bindings).

And on the app side (this repo):

- `app/src/stores/run.ts` — create/confirm/end sequence & event selection.
- `app/src/stores/runHistory.ts` — client-side history + `reconcile()`.
- `app/src/services/schedule.ts` — the REST lookups actually used.
- `app/src/services/telemetry/` — the dev/prod transport seam.
