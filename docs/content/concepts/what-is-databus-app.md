# What is the Databús app

Cross-platform operator/on-board client for the **Databús** transit system
(UCR / SIMOVI). Bus drivers and fleet operators use it to start and end runs,
stream real-time GPS telemetry, and (later) receive operational messages and
raise service alerts.

The app is **two things at once**:

- **A mobile UI** that talks to the Databús orchestrator over a REST API — the
  low-frequency **"warm path"** (login, start/end run, lifecycle events).
- **An MQTT telemetry publisher** that streams GPS fixes to the Databús
  telemetry broker — the high-frequency **"hot path"** (position updates).

It has **no backend of its own**. Every server-side concern — the run-lifecycle
FSM, GTFS Schedule/Realtime, the telemetry broker — lives in the sibling
[`databus`](https://github.com/simovilab/databus) repository. See
[System context](../architecture/system-context.md) for the full picture.

## Tech stack

- **Ionic Vue 8** + **Vue 3** (Composition API, `<script setup lang="ts">`) + **Vite**
- **Capacitor 8** — native shell (Android/iOS) + plugins (Geolocation, Preferences)
- **vite-plugin-pwa** (Workbox) — installable web build for on-device testing
- **Pinia** (setup stores) · **Vue Router** (Ionic router)
- **mqtt.js** (WebSocket) for the web/dev telemetry transport
- A custom Capacitor plugin (`app/plugins/capacitor-databus-telemetry/`) for the
  native production transport — Kotlin (Android) + Swift (iOS): TCP+TLS MQTT,
  foreground service, background location, native store-and-forward.

## Sibling repositories

Expected as siblings of this repo on disk:

| Repo | Role |
| --- | --- |
| `databus` | Django/DRF orchestrator, NanoMQ broker, Redis, RabbitMQ, Celery, the run-lifecycle FSM, GTFS Schedule + Realtime. **All backend behavior lives here.** |
| `databus-sim` | A fleet simulator that drives runs and publishes GTFS-Realtime telemetry — the primary way to exercise the full run lifecycle in dev. |
| `context` | System documentation spanning the whole SIMOVI/Databús platform. |
