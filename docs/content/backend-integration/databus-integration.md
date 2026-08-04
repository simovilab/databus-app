# Databús contract & open asks

The full, current document lives at
[`DATABUS_INTEGRATION.md`](https://github.com/simovilab/databus-app/blob/main/DATABUS_INTEGRATION.md)
in the repo root — this page summarizes it; that file is the source of truth
and moves faster than this one.

## What the app uses today

- **Warm path (REST)** — login, `create-run`, `runs/<id>/update/`,
  `runs/<id>/state/`, `routes/`, `trips/?route_id=`, `vehicle/`. See
  [The run lifecycle](../concepts/run-lifecycle.md).
- **Hot path (MQTT)** — `transit/vehicle/<id>/position`. See
  [Telemetry: hot path vs warm path](../concepts/telemetry-paths.md).

## Open asks, by priority

**Blocking Plan B (web app at a real domain + NavSat telemetry)**

- Confirm/enforce `Vehicle.id == plateNumber` (not currently a blocker — the
  convention already holds).
- Bring the in-backend HTTP telemetry adapter to a testable state, alongside
  the NavSat bridge (both paths required).
- Serve the app + a same-origin `/api` route (app-side workaround already
  shipped: see [VPS HTTPS device testing](../deployment/vps-https-testing.md)).
- DNS: one `A`/`AAAA` record unblocks testing (`sslip.io` sidesteps this
  entirely for now).

**High priority**

1. **Operator "current active run" endpoint** — no workaround; this is the
   main functional gap. See the known gap in
   [Persistence](../app-behavior/persistence.md).
2. **Run-list / run-history endpoint** — worked around today with client-side
   history in Preferences.
3. **Cancel-from-`Initialized` FSM transition** — no workaround; this is what
   causes the stuck-run bug in [Known issues](known-issues.md).

**Medium priority (prod enablement)**

4. Native telemetry broker config — staging/prod host, TLS trust chain, auth
   scheme.
5. CORS for the web build (optional; the dev proxy and same-origin trick
   avoid needing it so far).

**Low priority**

6. Expose `id` on `VehicleSerializer` (app has a workaround).
7. Fix or retire the discovery endpoints (app doesn't use them).
