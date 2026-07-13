# Deploy-time databus backend blockers (Part-B bring-up)

Three **databus-repo (backend)** issues surfaced while bringing up the minimal
subset on the VPS (`orchestrator + database + state`) behind Traefik for the
`app.167.233.130.36.sslip.io` HTTPS device test. Each was **worked around at
runtime only** — nothing was applied to the databus source (per the
"don't edit the databus repo" rule). Route these to whoever owns `databus`.

> Companion to the app-integration contract in the repo-root
> [`DATABUS_INTEGRATION.md`](../DATABUS_INTEGRATION.md). That file is the app↔backend
> API contract + asks P1–P4; **this** file is the deploy-time backend defects found
> standing the stack up. Same basename, different scope — consider merging these
> into the root file's "Asks for the Databús team" section if one asks doc is preferred.

The deploy itself is verified good: prebuilt `deploy/` config deployed unmodified,
trusted Let's Encrypt **prod** cert, both B10 curls `200` (root and `/api/`), and
`login → create-run` succeeds end-to-end over HTTPS.

---

## B1 — `docker-entrypoint.sh` `APPS_TO_MIGRATE` omits `operations` + `runs`

**Symptom:** login is impossible — the `operations`/`runs` tables never exist.

**Root cause:** `backend/docker-entrypoint.sh` migrates only a subset of apps via
`APPS_TO_MIGRATE`, which omits `operations` and `runs`. Because each app's
`migrations/` directory is **gitignored**, a fresh checkout has no migration files
to auto-discover, so those tables are never created.

**Ask:** add `operations`, `runs` (and `gtfs`) to `APPS_TO_MIGRATE` — or stop
gitignoring the `migrations/` directories so `migrate` discovers them normally.

## B2 — `website/fixtures/auth.json` pins `auth.permission` PKs that collide

**Symptom:** `loaddata auth.json` aborts with an integrity/duplicate-PK error, so
no users load.

**Root cause:** the fixture ships `auth.permission` rows with hard-coded PKs that
collide with the permissions Django auto-creates during `migrate`.

**Ask:** re-dump the fixture to contain **only `auth.user` rows** (drop the
`auth.permission` entries); permissions are created by `migrate`.

## B3 — `operations/fixtures/operations.json` uses stale app label `operation.*`

**Symptom:** `loaddata operations.json` fails — the fixture is unloadable.

**Root cause:** the fixture's `model` labels are `operation.*`, but the app label is
**`operations`** (plural). Django can't resolve `operation.operator` etc.

**Ask:** re-dump `operations.json` against the current app label
(`manage.py dumpdata operations …`) so the labels read `operations.*`.

## B4 — stuck resource binding: an INITIALIZED run that can't start never releases

**Symptom:** after a `create-run` reaches **INITIALIZED** but then can't be
started/confirmed because the operator (or trip or vehicle) is already assigned to
another run, the resource — the **operator at least** — stays bound. Every later
`create-run` for that operator fails validation ("Operator '<id>' is already
assigned to run <id>") with **no API way to release it** → the operator is stuck.

**Root cause:** `update_system_state` writes `operator:<id>:current_run` /
`vehicle:<id>:current_run` / `trip:<id>:current_run` at INITIALIZE, but
`release_resources` only runs on a **terminal** FSM transition, and there is **no
`cancel_run` transition from INITIALIZED** (only from CONFIRMED/TRACKING). A run that
never advances therefore holds its Redis bindings forever.

**Ask:** add an `INITIALIZED --cancel_run--> CANCELLED` transition (with
`is_cancellation_authorized` + `release_resources`). This is the operational
manifestation of **ask #3 ("Cancel-from-`Initialized` transition")** in the repo-root
[`DATABUS_INTEGRATION.md`](../DATABUS_INTEGRATION.md).

**Interim unstick (runtime only):** clear the stale binding with the databus repo's
`scripts/cleanup_redis.py`.

---

## Runtime workarounds used on the VPS (FYI — not committed)

These are VPS-side runtime state, deliberately **not** mirrored into git:

- `databus/.env` needed `ALLOWED_HOSTS` to include
  `app.167.233.130.36.sslip.io,orchestrator` (missing → HTTP 400 under
  `DEBUG=False`). That is databus's gitignored env, not a databus-app file.
- The Traefik `staging` `caServer` was toggled on then off during cert issuance →
  net-zero diff; nothing to mirror.
- The box runs databus's **dev** stack (`compose.dev.yml`), so the dev
  `orchestrator` was manually `docker network connect`'d to `traefik_proxy`.
  `compose.prod.yml` already joins that network, so this is dev-only, not a config
  change.

> **Reproduction commands:** capture the exact `loaddata` / `migrate` invocations and
> their error output from the Part-B deploy session and append them under each
> blocker above — they were not included in the handoff this file was written from.
