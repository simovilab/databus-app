# Handoff — databus-app HTTPS device-testing (Plan B)

> A fresh agent should read this first, then `DATABUS_INTEGRATION.md` (backend
> contract + asks) and `deploy/VPS_HTTPS_TESTING.md` (the executable runbook).

## Project
`databus-app` — Ionic Vue 8 + Capacitor 8 **operator client** for the Databús
transit system (UCR/SIMOVI). No backend of its own. Branch: `feat/vertical-slice-v0`.
Constraint: **no PR to `main` without explicit user go-ahead.**

**Sibling repos** (read-only for facts; do **not** edit `databus`):
- `../databus` — Django/DRF + NanoMQ + Redis/Celery + run-lifecycle FSM. Source of
  truth for backend facts. Prod topology in `compose.prod.yml` (Traefik + Let's Encrypt).
- `../databus-sim` — fleet simulator to drive a run through its full lifecycle.
- `../navsat-bridge` — polls NavSat's fleet HTTP API, archives to S3 (Parquet), and
  optionally republishes to the databus MQTT broker on the canonical contract.

## The goal driving this work ("Plan B")
Get the app testable **over real HTTPS on physical iPhone/iPad + a simulated
Android**, **without** app-store approval and **without** the app's own native
telemetry. Telemetry comes from **NavSat** (server-side), so the operator app is
**warm-path-only** (login → create-run → confirm → end) for this deployment. The app
**retains** its optional GPS-transmit seam (`src/services/telemetry/`) — leave it in,
don't remove.

## Key technical findings (verified against `../databus`)
1. **Vehicle identity is NOT a problem** (corrected from an earlier wrong take).
   `Vehicle.id = CharField(primary_key=True)` — a **string PK**, seeded
   `id == license_plate` (`SJB1234`/`SJB5678`). So app-binding, the bridge's
   plate-topic, and ingestion all key on the same string → NavSat telemetry lands
   with no code change. Only requirement: register real vehicles with
   `id == NavSat plate` (a convention, not code).
2. **Two telemetry paths, both must be tested** (per user): (A) `navsat-bridge`
   (works today), and (B) generalized **in-backend HTTP adapters** — `databus` branch
   `feat/fetch-telemetry` (commit `c5ef42b`), currently a **sketch** needing:
   auth / response-shape / units / fetch-granularity handling + two bug fixes
   (republish topic missing the `transit/` prefix; dead `elif type=="both"`).
3. **Reverse proxy exists**: Traefik in `databus/compose.prod.yml` (external
   `traefik_proxy` network, Traefik itself not in repo). **Same-origin trick**: app's
   `apiClient.getBaseUrl()` resolves relative `/api` against `window.location.origin`,
   so Traefik path-routing `/api → orchestrator` on the app host needs **no CORS, no
   backend edit**.
4. **Domains**: live zone is `simovilab.`**`org`** (GoDaddy) — but backend config uses
   `.com` (NXDOMAIN, not deployed). `databus.simovilab.org` is live **GitHub Pages
   docs — don't repoint**. `app.databus.simovilab.org` is free but needs the
   (currently unreachable) GoDaddy owner. **→ Use `sslip.io` (`app.<VPS_IP>.sslip.io`)
   — zero permission, real Let's Encrypt cert.**
5. **DB seed is scripted** (no external dependency): `DJANGO_SETUP=True` auto-loads
   GTFS on boot; then `loaddata auth.json operations.json` + a shell snippet to set an
   operator password. **Login = `maria` (or `jose`) + `test12345`** (the README's
   `demo`/`demo12345` is NOT in the backend seed).
6. **Gotcha**: `DEBUG=False` makes `ALLOWED_HOSTS` **required** (no default) — must
   include the app host or every request 400s.

## Infra target
Hetzner VPS, **4 vCPU / 8 GB, shared with other periodic tasks** → **minimal backend
subset**: `orchestrator + database + state` + Traefik + app nginx. (Telemetry tier
adds `telemetry-broker + message-broker + realtime-engine`.)

## Deliverables in this repo
- **`DATABUS_INTEGRATION.md`** — §6 (NavSat via bridge + corrected identity +
  in-backend adapter as must-do), §7 (deploy/reverse-proxy + DNS reality), Plan B
  asks **P1** (keep `id==plate`), **P2** (serve app + same-origin `/api`), **P3**
  (DNS/naming), **P4** (in-backend adapter, must-do).
- **`deploy/VPS_HTTPS_TESTING.md`** — agent runbook, **Part A (off-VPS)** vs
  **Part B (on-VPS)**.
- **`deploy/` artifacts** (created — the Part-A files the runbook references):
  - `app/.env.production` — `VITE_API_BASE_URL=/api` (same-origin).
  - `deploy/nginx.conf` — SPA history-mode fallback for `createWebHistory`.
  - `deploy/compose.app.yml` — nginx serving `dist/`, Traefik labels.
  - `deploy/.env.example` — copy to `deploy/.env`, set `APP_DOMAIN`.
  - `deploy/traefik/traefik.yml` — static config (entrypoints + LE resolver).
  - `deploy/traefik/dynamic/dynamic.yml` — middlewares + same-origin `/api` router.
  - `deploy/traefik/compose.traefik.yml` — Traefik service.

## Decisions locked in
- Identity: convention (`id==plate`), not a blocker.
- VPS scope: minimal subset + app.
- Domain: sslip.io now, `.org` later.
- Both telemetry paths in scope.

## Recommended next step
The Part-A artifacts now exist. Next: a first **sslip.io** deploy on the VPS
following **Part B** of `deploy/VPS_HTTPS_TESTING.md` (Docker, firewall 80/443,
Traefik up, minimal subset up, seed per B8, app up, verify on devices). Before that,
fill placeholders: `APP_DOMAIN` in `deploy/.env`, and `ALLOWED_HOSTS` + the Host in
`deploy/traefik/dynamic/dynamic.yml` to the chosen `app.<VPS_IP>.sslip.io`.

## Open items for the team (not blocking Part A)
- **P4**: fix `feat/fetch-telemetry` for telemetry Path B (databus-side).
- **Domain naming**: `.com` vs `.org` vs `…ucr.ac.cr` canonical (needs GoDaddy owner).
- **Backend secrets** for `databus/.env`/`.env.prod` (incl. `ALLOWED_HOSTS`).
