# Telemetry: hot path vs warm path

The app talks to `databus` over two entirely separate channels, chosen
deliberately for their different frequency and reliability requirements.

| | Warm path | Hot path |
| --- | --- | --- |
| Protocol | HTTP / REST | MQTT |
| Carries | Sporadic events: login, create/confirm/end run, lifecycle transitions | High-frequency GPS position updates |
| Destination | The orchestrator (Django + DRF) | The telemetry broker (NanoMQ) |
| Topic / endpoint | `POST /api/...` | `transit/vehicle/<id>/position` |

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

The hot path is implemented by `TelemetryRuntime` — one interface with two
implementations picked at runtime (web/dev vs native/prod). See
[Telemetry seam (dev vs prod)](../architecture/telemetry-seam.md) for the full
breakdown of that split, including why the web build ships with telemetry
disabled in production.
