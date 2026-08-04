# Getting started

## Prerequisites

- Node 20+ and npm
- The **`../databus`** stack running (orchestrator on `:8000`, telemetry
  broker reachable) — see that repo's README.
- Optionally **`../databus-sim`** to drive runs through the full lifecycle.

## Install & configure

```bash
cd app
npm install
cp .env.example .env      # defaults are correct for local dev
```

`.env` (dev defaults):

```dotenv
VITE_API_BASE_URL=/api                 # relative → Vite proxies to :8000 (avoids CORS)
VITE_MQTT_URL=ws://localhost:8083/mqtt # dev-only MQTT-over-WebSocket listener
```

## Run the app

```bash
npm run dev                # Vite dev server, default http://localhost:5173
```

!!! note "Port note"

    Vite uses **5173** by default and **auto-increments** (5174, 5175 …) if
    it's taken. If you see the app on an unexpected port, a stale `npm run
    dev` (or an old git *worktree*) is still holding 5173. Kill stray `vite`
    processes (`pkill -f vite`) for a single source of truth, or pin one with
    `npm run dev -- --port 5173 --strictPort`. See also
    [Known issues](../backend-integration/known-issues.md) for how this bites
    multi-worktree setups specifically.

Sign in with the dev demo operator (seeded in `../databus` — see that repo):

```
usuario:    demo
contraseña: demo12345
```

## Native builds

```bash
npm run build
npx cap sync                 # sync web assets + plugins into native projects
npx cap open android         # or: npx cap open ios
```

The native telemetry broker host is configured in `app/capacitor.config.ts`
under `plugins.DatabusTelemetry` (`brokerHost`, `brokerPort: 8883`, `useTls:
true`). Credentials are **never** committed there — they are injected
per-call. The placeholder host must be set by ops before a real native build
— see [Databús contract & open asks](../backend-integration/databus-integration.md).
