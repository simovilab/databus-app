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

## Asks for the Databús team

Actionable items, roughly in priority order. Each notes whether the app is
currently **blocked** or has a **workaround**.

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
