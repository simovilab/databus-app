# VPS HTTPS setup for `databus-app` — agent runbook

**Goal:** serve the `databus-app` operator client over **real HTTPS** on a Hetzner
VPS so it can be tested on physical phones/tablets and any simulated Android — with
a live, minimal `databus` backend behind it. No app-store involvement.

**Audience:** an agent (or operator) with shell access to the VPS. Read this whole
file first. It is split into:

- **Part A — do now, off the VPS (in this repo).** Everything preparable without
  touching the server: the production web build, the static-serve config, the
  Traefik config, and the compose glue. Do the heavy Node build **here**, not on
  the resource-limited box.
- **Part B — on the VPS.** Everything that requires the server: Docker, DNS,
  firewall, bringing the stack up, TLS issuance, seeding, and device verification.

> Cross-repo note: this app has **no backend of its own**. The backend comes from
> the sibling **`databus`** repo (`../databus`, `compose.prod.yml`). Do **not** edit
> the `databus` repo; this runbook drives it as-is and adds the app + routing
> alongside it.

---

## Architecture (what we're building)

```
                         ┌────────────────────── VPS (Docker) ──────────────────────┐
  phone / tablet         │                                                          │
  Safari / Chrome  ──TLS──▶  Traefik  ──Host(app…) && PathPrefix(/api)──▶ orchestrator:8000 (Django)
  https://app.…          │     │                                          ├─ database  (Postgres/PostGIS)
                         │     └──Host(app…) (everything else)──▶ app:80 (nginx → dist/)
                         │                                          └─ state     (Redis)
                         └──────────────────────────────────────────────────────────┘
```

**Key idea — same-origin.** The app is served at one host (e.g.
`app.databus.simovilab.org`). `apiClient.getBaseUrl()` resolves the relative
`VITE_API_BASE_URL=/api` against `window.location.origin`, so every API call is
**same-origin** → **no CORS needed** (the backend has no `django-cors-headers`).
Traefik path-routes `/api/*` on that host to the Django `orchestrator`; everything
else goes to the static app. This needs **one DNS record**, no separate api domain.

**Minimal backend subset** (chosen for the 4 vCPU / 8 GB shared box): only
`orchestrator + database + state` from `databus/compose.prod.yml`. Skips the
analytics tier (Prefect/Flower/docs/Nuxt) and the async workers. This is enough for
the **warm path** (login → create-run → confirm → end). See
[Telemetry tier](#telemetry-tier--test-both-paths-on-vps) to add live positions.

---

## Prerequisites & open dependencies (confirm before starting)

- [ ] **VPS**: Hetzner, 4 vCPU / 8 GB, already running other periodic tasks — keep
      the footprint minimal. Prefer the **Ashburn (US-East)** region if this box
      might later carry live telemetry (~50–70 ms to Costa Rica vs ~150 ms from EU).
- [ ] **Backend secrets** (from the databus team): values for `databus/.env` and
      `.env.prod` — `SECRET_KEY`, `DB_PASSWORD`, `REDIS_PASSWORD`. The minimal
      subset does **not** need RabbitMQ/Prefect creds.
- [ ] **DB seed**: **scripted, no external dependency** — fixtures ship in the
      databus repo (GTFS auto-loads on boot; users/operators/vehicles via `loaddata`;
      set a known operator password). Full commands in [B8](#b8-migrate--seed-now-scripted--no-databus-team-dependency).
      *(The `demo`/`demo12345` login referenced in the app README is **not** in this
      seed — the seeded operators are `fabian`/`maria`/`jose`; B8 sets a password.)*
- [ ] **`ALLOWED_HOSTS`**: with `DEBUG=False`, Django **requires** `ALLOWED_HOSTS`
      (no default) to include `APP_DOMAIN`, or every request 400s. Set it in
      `databus/.env` (see A7) — this is the most common first-deploy trip-up.
- [ ] **DNS access** (only for the pretty hostname): ability to add a record in the
      **`simovilab.org`** zone at **GoDaddy** (`ns5*.domaincontrol.com`). **Not
      needed now** — the `sslip.io` path below needs **zero DNS access / zero
      permission** and still gives a real cert.
- [ ] **Telemetry (both paths, this round)**: NavSat **bridge** *and* the in-backend
      **HTTP adapter** — see [telemetry tier](#telemetry-tier--test-both-paths-on-vps).
      Positions land as-is because `Vehicle.id == plate` in the seed (no plate↔PK
      step). The warm path itself does not need telemetry.

### Choose the hostname (both documented — pick per DNS availability)

| Option | Hostname | DNS work | When |
|---|---|---|---|
| **A — sslip.io** (fastest) | `app.<VPS_IPV4>.sslip.io` (e.g. `app.203.0.113.5.sslip.io`) | **none** — sslip.io resolves the embedded IP automatically | Test today; no GoDaddy access needed. Real Let's Encrypt cert. |
| **B — real subdomain** | `app.databus.simovilab.org` | **one** A/AAAA record → VPS IP, at GoDaddy | Nicer URL; when you have zone access. |

> **Do NOT touch `databus.simovilab.org`** — it is a live **GitHub Pages** docs
> site. Only create the **new** `app.` subdomain. `api.…` is not needed (same-origin).

> **On "do we need permission to use the domain?"** — **No, not for testing.** The
> `.org` zone is at GoDaddy and its owner is currently unreachable, so Option B (the
> pretty subdomain) is blocked for now. Option A (**sslip.io**) needs **no domain,
> no DNS record, and no owner** — it maps `app.<VPS_IP>.sslip.io` to your VPS IP
> automatically and Let's Encrypt issues a real, phone-trusted cert against it. All
> you control (VPS IP + open ports 80/443 + `ALLOWED_HOSTS`) is sufficient. Use A
> now; move to B whenever the GoDaddy owner can add one record.

Whichever you pick becomes `APP_DOMAIN` below. You can start on A and cut over to B
later by adding the DNS record and changing `APP_DOMAIN` (Traefik re-issues the cert).

---

## Part A — do now, off the VPS (in this repo)

All paths are relative to the `databus-app` repo root unless noted.

### A1. Production web build config

Create **`app/.env.production`** (Vite auto-loads it for `vite build`):

```dotenv
# Served same-origin behind Traefik; /api is proxied to the orchestrator on the
# same host, so a RELATIVE base is correct (resolved against window.location.origin).
VITE_API_BASE_URL=/api

# App self-transmit is OFF for this build (NavSat/bridge owns positions server-side).
# The web publisher only connects if telemetry.start() is called; this value is a
# placeholder until a WSS MQTT listener is exposed in prod. See DATABUS_INTEGRATION.md §5–§6.
VITE_MQTT_URL=wss://REPLACE_IF_APP_TELEMETRY_ENABLED/mqtt
```

### A2. Build the SPA (do the Node build HERE, not on the VPS)

```bash
cd app
npm ci
npm run build        # vue-tsc + vite build → app/dist/
```

Sanity-check `app/dist/index.html` exists. `dist/` is the artifact you ship to the
VPS in Part B (the box stays free of a Node toolchain).

### A3. nginx static-serve config

The router uses **HTML5 history mode** (`createWebHistory`), so nginx must fall back
to `index.html` for client-side routes. Create **`deploy/nginx.conf`**:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA history-mode fallback: unknown paths serve index.html (Vue Router takes over).
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Long-cache hashed assets; never cache the entry document.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
```

> `/api` is **not** handled here — Traefik path-routes it to the orchestrator before
> it reaches nginx (see A5).

### A4. App service compose

Create **`deploy/compose.app.yml`**. Serves `dist/` via `nginx:alpine`, joined to
the shared external `traefik_proxy` network. The app router is **low priority** so
the `/api` router (A5) wins for API paths.

```yaml
name: databus-app-web

services:
  app:
    image: nginx:alpine
    restart: unless-stopped
    volumes:
      - ./dist:/usr/share/nginx/html:ro      # ship app/dist here (Part B, B5)
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    networks: [traefik_proxy]
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`${APP_DOMAIN}`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      - "traefik.http.routers.app.tls=true"
      - "traefik.http.routers.app.tls.certresolver=${CERT_RESOLVER:-letsencrypt}"
      - "traefik.http.routers.app.priority=1"
      - "traefik.http.routers.app.middlewares=security-headers@file,compression@file"
      - "traefik.http.services.app.loadbalancer.server.port=80"
      - "traefik.docker.network=traefik_proxy"

networks:
  traefik_proxy:
    external: true
```

Set `APP_DOMAIN` (and `CERT_RESOLVER`) via a `deploy/.env` file next to the compose,
or export them in the shell before `docker compose up`.

### A5. Same-origin `/api` router (Traefik file provider — no databus edit)

Rather than editing the databus repo's orchestrator labels, define the `/api` router
in Traefik's **file provider**, pointing at the orchestrator container by name (both
share `traefik_proxy`). This keeps `databus/compose.prod.yml` untouched. It lives in
the Traefik dynamic config created in A6 — shown here so it's in context:

```yaml
# (goes inside deploy/traefik/dynamic.yml — see A6)
http:
  routers:
    app-api:
      rule: "Host(`app.databus.simovilab.org`) && PathPrefix(`/api`)"   # ← set to APP_DOMAIN
      entryPoints: [websecure]
      service: databus-orchestrator
      priority: 10                     # beats the app router (priority 1)
      middlewares: [security-headers, rate-limit]
      tls:
        certResolver: letsencrypt
  services:
    databus-orchestrator:
      loadBalancer:
        servers:
          - url: "http://orchestrator:8000"
```

> No path rewrite: the app calls `/api/login/` and Django serves under `/api/`
> (matches the dev Vite proxy, which also does not strip `/api`).

### A6. Traefik config (only if the VPS has no Traefik yet)

`databus/compose.prod.yml` assumes an **external** `traefik_proxy` network and a
Traefik instance that **is not in the repo**, and it references `security-headers@file`,
`rate-limit@file`, `compression@file`. If Traefik is already running on the box with
those middlewares, **skip this step** and just add the `app-api` router (A5) to its
dynamic config. Otherwise create these:

**`deploy/traefik/traefik.yml`** (static config):

```yaml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint: { to: websecure, scheme: https }
  websecure:
    address: ":443"
  mqtt:                      # only needed for the telemetry tier (8883)
    address: ":8883"

providers:
  docker:
    exposedByDefault: false
    network: traefik_proxy
  file:
    directory: /etc/traefik/dynamic
    watch: true

certificatesResolvers:
  letsencrypt:
    acme:
      email: ops@simovilab.org           # ← set a real contact
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web
  # While iterating, use LE STAGING to avoid rate limits, then switch to prod:
  # caServer: https://acme-staging-v02.api.letsencrypt.org/directory
```

**`deploy/traefik/dynamic.yml`** (file provider — middlewares + the A5 `/api` router):

```yaml
http:
  middlewares:
    security-headers:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
        stsSeconds: 31536000
    rate-limit:
      rateLimit:
        average: 100
        burst: 50
    compression:
      compress: {}

  # --- same-origin /api router from A5 (set the Host to APP_DOMAIN) ---
  routers:
    app-api:
      rule: "Host(`app.databus.simovilab.org`) && PathPrefix(`/api`)"
      entryPoints: [websecure]
      service: databus-orchestrator
      priority: 10
      middlewares: [security-headers, rate-limit]
      tls:
        certResolver: letsencrypt
  services:
    databus-orchestrator:
      loadBalancer:
        servers:
          - url: "http://orchestrator:8000"
```

**`deploy/traefik/compose.traefik.yml`**:

```yaml
name: traefik

services:
  traefik:
    image: traefik:v3
    restart: unless-stopped
    command: --configFile=/etc/traefik/traefik.yml
    ports:
      - "80:80"
      - "443:443"
      - "8883:8883"          # telemetry tier
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml:ro
      - ./dynamic:/etc/traefik/dynamic:ro
      - traefik_letsencrypt:/letsencrypt
    networks: [traefik_proxy]

volumes:
  traefik_letsencrypt:

networks:
  traefik_proxy:
    external: true
```

> Put `dynamic.yml` inside a `deploy/traefik/dynamic/` directory (the file provider
> watches the directory).

### A7. Backend env for the minimal subset

Coordinate secret values with the databus team; **do not commit real secrets**. The
subset (`orchestrator + database + state`) needs, in `databus/.env` + `.env.prod`:

- `SECRET_KEY` — Django secret.
- `DEBUG=False` — **required** (no default; `settings.py` reads `config("DEBUG")`).
- **`ALLOWED_HOSTS=<APP_DOMAIN>`** — **required** (no default;
  `config("ALLOWED_HOSTS", cast=Csv())`). Must contain the exact host you serve,
  e.g. `app.203.0.113.5.sslip.io` (or `app.databus.simovilab.org`). Without it,
  every API request returns **HTTP 400** even though TLS and routing are fine.
  Add `orchestrator` too if you also curl the container directly. Comma-separated.
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `REDIS_PASSWORD`.
- `DJANGO_SETUP=True` is already set on the `orchestrator` service in
  `compose.prod.yml` → it auto-runs migrate + collectstatic + `loaddata gtfs.json`
  on boot (see B8).
- The `*_DOMAIN` vars only feed the services' own Traefik labels; the same-origin
  route (A5) doesn't depend on `ORCHESTRATOR_DOMAIN` resolving — leave them so
  compose parses.

### A8. Commit these deploy artifacts

Commit A1–A6 (`app/.env.production`, `deploy/nginx.conf`, `deploy/compose.app.yml`,
`deploy/traefik/*`) so the VPS can `git pull` them. **Never** commit real secrets or
`acme.json`. `app/dist/` is a build artifact — either build on first deploy or ship
it out-of-band (B5).

---

## Part B — on the VPS

### B1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
docker compose version    # confirm the compose plugin is present
```

### B2. DNS (skip if using sslip.io)

Add in the **GoDaddy** `simovilab.org` zone:

```
Type  Name         Value              TTL
A     app.databus  <VPS_IPV4>         600
AAAA  app.databus  <VPS_IPV6>         600   (if the VPS has IPv6)
```

Verify from the VPS before requesting certs:

```bash
getent hosts app.databus.simovilab.org      # must show the VPS IP
```

If using **sslip.io**, no DNS step — `app.<VPS_IPV4>.sslip.io` already resolves.
Set `APP_DOMAIN` accordingly (and update the Host in `dynamic.yml`, A5/A6).

### B3. Firewall

Open **80** and **443** (80 is required for the Let's Encrypt HTTP-01 challenge).
Open **8883** only for the telemetry tier. On Hetzner, do this in the Cloud
Firewall **and**/or on-host (`ufw`):

```bash
ufw allow 80,443/tcp
# ufw allow 8883/tcp    # only for the telemetry tier
```

### B4. Get the repos + config onto the box

```bash
git clone <databus repo>       # provides compose.prod.yml + build contexts
git clone <databus-app repo>   # provides deploy/*
```

Fill in `databus/.env` + `databus/.env.prod` (A7) and `databus-app/deploy/.env`
(`APP_DOMAIN=...`, `CERT_RESOLVER=letsencrypt`).

### B5. Ship the built `dist/`

Either build on the box (needs Node — heavier) or, preferred, copy the artifact
built in A2 from your machine:

```bash
# from your workstation:
rsync -av databus-app/app/dist/  <vps>:~/databus-app/deploy/dist/
```

`deploy/compose.app.yml` bind-mounts `./dist` (i.e. `deploy/dist/`).

### B6. Bring up Traefik + the external network

```bash
docker network create traefik_proxy        # the external network both stacks join
cd databus-app/deploy/traefik
docker compose -f compose.traefik.yml up -d
docker logs -f traefik                      # watch for ACME / config errors
```

> Tip: keep the LE **staging** `caServer` (A6) enabled until routing works, then
> switch to production and recreate Traefik so a trusted cert is issued.

### B7. Bring up the minimal backend subset (from the databus repo)

Compose resolves `depends_on`, so naming the three services also starts nothing
extra:

```bash
cd ../../..            # to the databus repo root
docker compose -f compose.prod.yml up -d orchestrator database state
docker compose -f compose.prod.yml ps
```

Confirm `orchestrator` joined `traefik_proxy` (it does per `compose.prod.yml`) so
Traefik can reach `http://orchestrator:8000`.

### B8. Migrate + seed (now scripted — no databus-team dependency)

`DJANGO_SETUP=True` + `DEBUG=False` means the orchestrator entrypoint
(`backend/docker-entrypoint.sh`) already ran `migrate`, `collectstatic`, and
`loaddata gtfs.json` on boot — so the **GTFS feed (routes/trips/shapes)** is loaded.
With `DEBUG=False` it does **not** load users/operators/vehicles or make a superuser,
so seed those explicitly and set a login password:

```bash
cd <databus repo>

# users (fabian/maria/jose) + operators + vehicles (SJB1234, SJB5678):
docker compose -f compose.prod.yml exec orchestrator \
    uv run python manage.py loaddata auth.json operations.json

# set a known password on a seeded operator so the app can log in:
docker compose -f compose.prod.yml exec orchestrator \
    uv run python manage.py shell -c "
from operations.models import Operator
op = Operator.objects.first()
u = op.user; u.set_password('test12345'); u.save()
print('APP LOGIN  username=%s  password=test12345  operator_id=%s' % (u.username, op.pk))
"
```

**Your app login** is the printed `username` + `test12345`. (Seeded operators are
`maria`/`jose`, each linked to an `operator_id` like `1-1234-5678`; the app README's
`demo`/`demo12345` is **not** in this seed.) `operations.json` also seeds two
historical `IN_PROGRESS` **DB** run rows — harmless: run *bindings* live in Redis,
which `loaddata` does not touch, so `create-run` still works. Clear a stale Redis
binding later with the databus repo's `scripts/cleanup_redis.py` if needed.

> Live NavSat testing later needs vehicles registered with the **real** NavSat
> plates (the seed uses `SJB1234`/`SJB5678`). Keep `Vehicle.id == plate`.

### B9. Bring up the app

```bash
cd ../databus-app/deploy
docker compose --env-file .env -f compose.app.yml up -d
```

### B10. Verify

```bash
# From the VPS:
curl -sI https://$APP_DOMAIN            | head       # 200, valid TLS
curl -sI https://$APP_DOMAIN/api/       | head       # reaches Django (401/200/404, not 502)
```

Then on devices:

1. Open `https://$APP_DOMAIN` in **iPhone Safari**, **iPad Safari**, and a
   **simulated Android** (Android Studio emulator Chrome, or Appetize/BrowserStack).
2. On iOS: **Share → Add to Home Screen** for the full-screen PWA feel.
3. Run the warm path end-to-end: **login → route → trip → vehicle → create-run →
   confirm → end**. Watch `docker logs orchestrator` for errors.

Expected: green padlock, login works, the run wizard lists routes/trips, create-run
succeeds or surfaces the real backend message. (A run will not advance past Confirmed
without telemetry — that's the tier below, and the sim in `../databus-sim`.)

---

## Telemetry tier — test BOTH paths (on VPS)

Live positions so runs progress past Confirmed. **Two paths are in scope this round**
and both should be exercised (`DATABUS_INTEGRATION.md` §6). Positions land as-is
because `Vehicle.id == plate` in the seed — there is **no plate↔PK step** (P1 is just
"keep `id == plate` when registering real vehicles").

First bring up the broker + the worker that ingests telemetry (adds RabbitMQ —
heavier; watch `docker stats` on the shared box):

```bash
docker compose -f compose.prod.yml up -d telemetry-broker message-broker realtime-engine
```

**Path A — NavSat bridge (MQTT).** Run `navsat-bridge` (its own repo/compose) with
`MQTT_ENABLED=true` and `MQTT_HOST` pointed at the broker. It publishes
`transit/vehicle/<plate>/position`; ingestion matches it to the run bound under the
same id. For a real NavSat run, register the `Vehicle` with the **actual NavSat
plate** (the seed's `SJB1234`/`SJB5678` won't match a live feed).

**Path B — in-backend HTTP adapter.** Requires `feat/fetch-telemetry` brought to a
working state first (`DATABUS_INTEGRATION.md` **P4**: fix auth / response-shape /
units / fetch-granularity + the `transit/` topic-prefix and dead-code bugs).
Configure a test `Vehicle` with `position_source_type='http'`, `position_source_url`,
and `position_source_paths`, then let the Celery task (`fetch_position` /
`update_gtfs_realtime`) poll and republish. Verify it emits the **corrected** topic
`transit/vehicle/<id>/position` so ingestion picks it up, and that A and B don't
**double-publish** the same vehicle.

**No live feed handy?** Drive a run to completion with **`../databus-sim`** to
exercise the lifecycle without either provider.

---

## Cutover, security, and teardown

- **sslip.io → real domain:** add the GoDaddy record (B2), change `APP_DOMAIN` and
  the `dynamic.yml` Host to `app.databus.simovilab.org`, recreate the app service +
  Traefik. LE issues the new cert automatically.
- **Secrets:** keep `databus/.env*` and `acme.json` off git and `chmod 600`. Use LE
  **staging** while iterating to avoid the prod rate limit (5 duplicate certs/week).
- **Resource watch:** minimal subset (`nginx + orchestrator + postgres + redis +
  traefik`) is light (~1–1.5 GB). The telemetry tier adds RabbitMQ + a worker —
  monitor `docker stats` given the box's other periodic tasks.
- **Teardown:** `docker compose -f compose.app.yml down` (app),
  `docker compose -f compose.prod.yml down` (backend),
  `docker compose -f compose.traefik.yml down` (Traefik). Add `-v` to drop volumes
  (DB data, LE certs) — only if you mean it.

---

## Open items to confirm with the team

1. ~~DB seed path~~ — **solved** (B8: fixtures + a password snippet, no dependency).
2. **P4 — in-backend HTTP adapter** must reach a testable state for telemetry Path B
   (bridge Path A works today). Databus-side work.
3. **P1 — keep `Vehicle.id == plate`** when registering real vehicles (not a blocker;
   convention only). No plate↔PK reconciliation needed.
4. **Domain naming** — `.org` (live zone) vs `.com` (backend config) vs `…ucr.ac.cr`
   (discussed). Testing uses `sslip.io` now / `app.databus.simovilab.org` later; the
   prod canonical name is TBD (and needs the GoDaddy owner for the `.org` record).
5. **Backend secrets** for `databus/.env` + `.env.prod` (incl. `ALLOWED_HOSTS`).
