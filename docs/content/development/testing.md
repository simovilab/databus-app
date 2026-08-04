# Testing

```bash
cd app
npm run lint          # eslint
npm run test:unit     # vitest (unit) — use `npx vitest run` for a single pass
npm run build          # vue-tsc typecheck + vite build
npm run test:e2e      # cypress (e2e) — needs the dev server running
```

Current status: **lint clean · 121 unit tests · typecheck + build green.**

## Testing the full run lifecycle

Unit/e2e tests mock the backend. To exercise the **real** lifecycle
(Confirmed → Tracking → In Progress → terminal), run against
**`../databus-sim`**, which publishes GTFS-Realtime telemetry that drives the
FSM forward — the app then shows the states advancing live.

## Testing: dev vs prod {: #testing-dev-vs-prod }

The transport differs by environment **by design**, and the two paths
exercise different code:

| | **Development** | **Production** |
| --- | --- | --- |
| **API** | `http://localhost:8000`, reached via the **Vite dev proxy** at `/api` (sidesteps CORS — the backend has no `django-cors-headers`) | `https://<api-domain>` on **443 / TLS** |
| **Telemetry** | **MQTT over WebSocket** (`ws://…:8083/mqtt`) using **mqtt.js**, in the browser | **raw MQTT over TCP + TLS** on **8883**, via the **native Capacitor plugin** — prod exposes *no* WebSocket listener |
| **GPS** | browser geolocation (foreground only) | native background location + foreground service |
| **Buffering** | in-memory queue | native store-and-forward across cellular gaps |
| **Runtime picked** | web runtime (`createWebRuntime`) | native runtime (`createNativeRuntime`) |

Practical consequences when testing:

- In a **desktop browser** there is no MQTT WebSocket broker unless one is
  running; telemetry status shows **`buffering`**, which is expected. The run
  lifecycle (REST) still works fully.
- The **prod TCP+TLS path cannot be exercised in a browser at all** — it only
  runs on a native device build through the plugin. Validating it end-to-end
  requires a device (or emulator), the plugin's `brokerHost` set to a
  reachable broker, and the TLS trust chain + auth scheme finalized with ops
  (tracked in
  [Databús contract & open asks](../backend-integration/databus-integration.md)).
