# Known issues

Confirmed bugs — not missing features (those are tracked as asks in
[Databús contract & open asks](databus-integration.md)).

## Backend: a stuck `Initialized` run permanently binds its operator/vehicle/trip

**Symptom.** If `create-run` reaches `Initialized` but the run is then
abandoned instead of confirmed, the backend never releases the Redis binding —
there's no `cancel_run` transition from `Initialized` (only from
`Confirmed`/`Tracking`). Every later `create-run` for that operator 4xxs with
"already assigned to run `<id>`," **permanently**.

**Root cause.** `update_system_state` writes `operator:<id>:current_run` /
`vehicle:<id>:current_run` / `trip:<id>:current_run` at `INITIALIZE`, but
`release_resources` only runs on a **terminal** FSM transition.

**This is a `databus` (backend) bug, not fixable from this repo.** Full
detail and the fix ask are in
[`deploy/DATABUS_INTEGRATION.md` §B4](https://github.com/simovilab/databus-app/blob/main/deploy/DATABUS_INTEGRATION.md).

**Verified interim unstick** (runtime only — `scripts/cleanup_redis.py` in the
`databus` repo does **not** fix this; it only expires stale vehicle telemetry
keys by age):

```bash
docker exec <state-container> redis-cli DEL \
  operator:<id>:current_run vehicle:<id>:current_run trip:<id>:current_run
```

Safe on a dev stack; on a shared/prod Redis, confirm no other run legitimately
holds one of those keys before deleting.

**How the app avoids triggering it.** `TripSetupModal`'s review step is
client-side-only for exactly this reason — the app never calls `create-run`
until the operator has truly committed. See
[Trip setup & route/trip labels](../app-behavior/trip-setup-and-labels.md) and
[The run lifecycle](../concepts/run-lifecycle.md).

## App: dev-server port drift across worktrees

Vite auto-increments past `5173` if the port is taken, silently — a stale
`vite` process (often left running in a different git worktree) squats on
`5173` and the next `npm run dev` lands on `5174`+ with no warning. See the
[Port note](../development/getting-started.md) in Getting started.
