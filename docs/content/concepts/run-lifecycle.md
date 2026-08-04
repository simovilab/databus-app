# The run lifecycle

Starting a run is a two-call REST sequence, after which the run store owns
telemetry:

```
create-run  ──▶ POST /api/create-run/                 → Initialized
confirm     ──▶ POST /api/runs/<id>/update/           → Confirmed
                { event: run_confirmed_by_operator }
              (telemetry.start() fires here, fire-and-forget)

… server advances Confirmed → Tracking → In Progress as GPS arrives …

end run     ──▶ POST /api/runs/<id>/update/
                { event: <run_interrupted | cancel_run>,
                  details: { actor_role: "operator" } }
              (telemetry.stop(); run recorded to local history)
```

In the app, `TripSetupModal` splits this into a single-screen setup form
followed by a client-side-only review step — see
[Trip setup & route/trip labels](../app-behavior/trip-setup-and-labels.md) for
why that review step exists and what it protects against.

## Key rules learned from the backend FSM

- **A GTFS trip already carries `route_id`, `direction_id` and `shape_id`.** The
  run wizard is `route → trip → vehicle`; there is **no** separate "direction"
  step. Trips come from `GET /api/trips/?route_id=`.
- **The operator cannot send `run_completed`.** That is the *system's*
  terminal-stop event (fired by the realtime engine at the trip terminal). The
  operator's manual "End run" sends `run_interrupted` (when the bus is already
  under way) or `cancel_run` (before it moves), each with
  `details.actor_role="operator"`. Because a run can finish without an operator
  action, the app records history whenever it **observes** any terminal state
  (`Completed`/`Cancelled`/`Interrupted`/`Short Turned`) — via the manual end
  *or* via the ~5s state poll — so system-completed runs still appear in
  history.
- **One active run per operator.** The backend binds an operator/vehicle/trip to
  a run until it reaches a terminal state; a second create-run for the same
  operator is rejected. The app surfaces the backend's real reason.

!!! warning "A stuck `Initialized` run never releases its binding"

    If a run reaches `Initialized` but is abandoned instead of confirmed, the
    backend has no way to release the operator/vehicle/trip binding — see
    [Known issues](../backend-integration/known-issues.md). This is exactly why
    the review step above is client-side only: the app never calls `create-run`
    until the operator has truly committed.

For the full detail behind these rules — including the exact backend
validation messages and where each is verified — see
[Databús contract & open asks](../backend-integration/databus-integration.md).
