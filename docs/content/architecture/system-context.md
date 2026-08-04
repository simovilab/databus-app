# System context

```
┌─────────────────────────┐         warm path (REST/HTTPS)        ┌──────────────────────────┐
│   databus-app (THIS)     │  ───────────────────────────────────▶ │   databus (orchestrator) │
│   Ionic Vue + Capacitor  │      login, create/confirm/end run     │   Django + DRF           │
│                          │                                        │   run-lifecycle FSM      │
│  ┌────────────────────┐  │         hot path (MQTT)                │   Redis · RabbitMQ ·     │
│  │ TelemetryRuntime   │  │  ───────────────────────────────────▶ │   Celery · GTFS          │
│  └────────────────────┘  │      transit/vehicle/<id>/position     └──────────────────────────┘
└─────────────────────────┘                                         ┌──────────────────────────┐
                                                                    │   telemetry broker       │
                                                                    │   NanoMQ (MQTT)          │
                                                                    └──────────────────────────┘
```

This repo has **no backend of its own** — see
[Telemetry: hot path vs warm path](../concepts/telemetry-paths.md) for what
travels over each connection.

## Sibling repositories

Expected as siblings of this repo on disk:

| Repo | Role |
| --- | --- |
| `databus` | Django/DRF orchestrator, NanoMQ broker, Redis, RabbitMQ, Celery, the run-lifecycle FSM, GTFS Schedule + Realtime. **All backend behavior lives here.** |
| `databus-sim` | A fleet simulator that drives runs and publishes GTFS-Realtime telemetry — the primary way to exercise the full run lifecycle in dev. |
| `context` | System documentation spanning the whole SIMOVI/Databús platform. |

Wire types (`app/src/types/api.ts`) are verified against
`databus/backend/api/{urls,views,serializers}.py`; changes there should be
reflected here in the same change.
