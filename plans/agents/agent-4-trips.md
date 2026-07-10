# Subagent A4 — Trips (the core vertical)

## Required reading
1. `plans/master-plan.md` — this is **your** slice. Own §2.1 steps 4–13, §4.2 (create-run body), §4.3 (lifecycle events), §4.4 (MQTT contract), §6.2 (`useRunStore`), §6.3 (`schedule`/`telemetry`/`geolocation`).
2. Verify against backend: `../databus/backend/api/views.py` (`CreateRunViewSet`, `RunStateViewSet`, `RunUpdateViewSet`, `FindTripsView`, `WhichShapesView`, `ServiceTodayView`) and `../context/behavior/databus/system/docs/run-lifecycle.md` (the FSM you are driving).
3. Root `SITEMAP.md` — Trips UX: "Sin viaje en progreso → iniciar viaje (modal); Con viaje en progreso → datos del viaje, alertas, finalizar." Alerts UI is deferred; build start + progress + end.

## Your mission
Build the **money path**: an operator with no active run opens a setup modal, picks route → shape → trip → vehicle, creates + confirms the run, then the Run Progress view streams GPS over MQTT while polling and displaying the lifecycle state, until the operator ends the run. This is the slice that proves the whole stack.

## Scope — files you OWN
- `app/src/views/TripsPage.vue` — switch on `useRunStore().activeRun`: none → an "Start run" CTA that opens `TripSetupModal`; present → render `RunProgress`.
- `app/src/components/trips/TripSetupModal.vue` — an `IonModal` wizard using `services/schedule.ts`:
  1. `getRoutes()` → pick route.
  2. `getServiceToday()` → resolve `service_id` (if multiple, pick first for v0 or let user choose).
  3. `getWhichShapes(routeId)` → pick direction/shape.
  4. `findTrips({routeId, serviceId, shapeId})` → list trips by `trip_time`; pick one.
  5. `getVehicles()` → pick vehicle (allow manual `vehicle_id` entry if the list is empty — Risk R3).
  6. Confirm → `runStore.createRun({vehicleId, operatorId, routeId, tripId, directionId, shapeId, scheduleRelationship:'SCHEDULED'})` (operatorId from `useAuthStore().session`). Handle `ApiError` (show which `step` failed). Dismiss on success.
- `app/src/components/trips/RunProgress.vue` — the live view. **It does NOT own telemetry** (per master §6.6, the run store starts telemetry on confirm and stops it on end, so it survives this screen unmounting / the phone locking). This component is read-only over telemetry:
  - Display `runStore.telemetry.status` / `lastFix` / `queuedCount` as a "streaming / buffering (N queued) / not connected" indicator. On web the transport is dev WS (R1); on native it's the A5 TCP+TLS background plugin — **this component doesn't care which**, it just reads the `TelemetryRuntime` refs.
  - Poll `runStore.refreshState()` every ~5 s; display the lifecycle state prominently (expect `Confirmed → Tracking → In Progress` to advance **on its own** as telemetry flows — the proof point).
  - Show current run summary (route, trip, vehicle, last fix).
  - **End run** button → `runStore.endRun()` (which stops telemetry). Only clear the poll interval on unmount — do **not** stop telemetry on unmount (the run may still be active in the background).
- `app/tests/e2e/run-flow.cy.ts` — Cypress smoke: login → start run (mock `schedule` API) → mock telemetry advancing state → end run. Mock API + MQTT so it runs without the databus stack.

## Rules
- Consume A2's stores/services **by their §6.2–6.3 signatures**; if not merged yet, code against the interfaces with local mocks and remove them once A2 lands. Do not write raw fetch/MQTT here — go through the services.
- Consume A1's shared UI + tokens (`<AppLoading>`, `<AppError>`, `<EmptyState>`).
- Do not edit `router/index.ts`, `main.ts`, `package.json`, services, or stores. Need a change there? Note it for A1/A2.
- Correctness of teardown matters: an ended/aborted run must stop GPS + MQTT + polling. Explicit error handling on every await; `<script setup lang="ts">`; files < 400 lines.
- **Skills (see master §3.2):** use `/ionic` for modal/list/select patterns and view lifecycle, and `/find-docs` for exact APIs — `/ionic-team/ionic-docs` (IonModal present/dismiss, IonSelect/IonList pickers, `onIonViewWillLeave`), `/mqttjs/mqtt.js` (publish semantics), `/ionic-team/capacitor-docs` (Geolocation watch). Verify, don't guess. The generator skills (`/capacitor-plugin-generator`, `/build-actions-generator`) are out of scope for v0.

## Definition of done
- Full path works against a local databus stack (GTFS loaded + the dev WS listener from R1): create → confirm → state visibly advances to `In Progress` from published GPS → end (`run_completed`) → terminal state.
- Teardown verified (no lingering GPS watch, MQTT connection, or interval after ending/leaving).
- Cypress smoke green with mocks; `npm run lint` + `npm run build` pass.
- Report: the state progression you observed, confirmation the `run_completed` end path worked (R4 resolved), and any contract friction with A2.
