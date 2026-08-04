# Persistence

The app persists three things to `@capacitor/preferences` (localStorage on
web, OS-backed storage on native):

- **Session** (`databus.session`) — token + operator identity.
- **Run history** (`databus.runHistory`) — an append-only log of finished
  runs. The backend has **no run-list endpoint**, so the app keeps its own. On
  entering the Runs tab it `reconcile()`s the log against
  `GET /runs/<id>/state/`: entries whose run 404s are pruned, survivors have
  their final state refreshed. History therefore only shows runs that still
  exist in the DB.
- **Settings** (`databus.settings`) — device-local preferences (display-name
  override, background-telemetry / keep-screen-on toggles, language, and the
  chosen color palette).

Stores are rehydrated in `main.ts` **before the router is installed**, so a
cold start (native) or refresh (web) restores the session before the auth
guard runs.

!!! warning "Known gap: the active run doesn't survive a refresh"

    The *active* run lives only in memory. After a web refresh (or if the OS
    kills a backgrounded native app mid-run) the Runs tab shows "no active
    run" even though it is live server-side. Resuming it needs a backend
    "operator's current run" endpoint — see
    [Databús contract & open asks](../backend-integration/databus-integration.md).
