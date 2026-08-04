# Telemetry seam (dev vs prod)

`TelemetryRuntime` is one interface with two implementations, chosen at
runtime by `Capacitor.isNativePlatform()`:

| | **Web / dev runtime** | **Native / prod runtime** |
| --- | --- | --- |
| Transport | mqtt.js over **WebSocket** | **raw TCP + TLS** via the native plugin |
| Broker | `ws://…:8083/mqtt` (dev listener) | `mqtts://<host>:8883` |
| GPS | browser `navigator.geolocation` | native background location |
| Buffering | in-memory queue | native store-and-forward across cellular gaps |
| Backgrounding | tied to the tab | foreground service, survives lock/background |

This split is deliberate — see
[Testing: dev vs prod](../development/testing.md#testing-dev-vs-prod).

## `VITE_TELEMETRY_ENABLED=false` — the web build has no broker

A browser build deployed to prod can reach **no** broker: prod exposes raw
TCP+TLS 8883 with no WS listener. Setting `VITE_TELEMETRY_ENABLED=false` (as
`app/.env.production` does) makes the web runtime report `status='unavailable'`
and skip the publisher and the GPS watcher entirely.

This exists because the honest-looking failure is worse than none. Without the
flag the runtime lands in **`'buffering'`** — which is the *store-and-forward*
state, and therefore a promise that fixes are held locally and flushed on
reconnect. With no broker to reconnect to, that promise is false: the ring
buffer fills to 500 and silently discards, mqtt.js retries a dead host every
second, and the operator is prompted for GPS to feed a queue that never
drains. The badge would read "Buffering, 500 queued" — indistinguishable from
working.

Only the literal string `'false'` disables it. Unset (dev/CI/native) keeps the
transport on, so a forgotten `VITE_MQTT_URL` still throws loudly instead of
silently no-oping. **Native ignores the flag** — it selects the plugin
regardless. To enable web telemetry later, expose a WSS listener, set the flag
true and `VITE_MQTT_URL` to a real URL: an env change, not a code change.
