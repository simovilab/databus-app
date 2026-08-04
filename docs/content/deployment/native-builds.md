# Native builds

```bash
npm run build
npx cap sync                 # sync web assets + plugins into native projects
npx cap open android         # or: npx cap open ios
```

The native telemetry broker host is configured in `app/capacitor.config.ts`
under `plugins.DatabusTelemetry` (`brokerHost`, `brokerPort: 8883`, `useTls:
true`). Credentials are **never** committed there — they are injected
per-call.

!!! warning "Not yet validated end-to-end on a device"

    **Native device validation** — building on device and exercising the
    TCP+TLS + background + store-and-forward telemetry path end-to-end — is
    still open work. It also depends on the backend team finalizing the
    **broker TLS trust chain + auth scheme** and providing a **staging broker
    host**; see
    [Databús contract & open asks](../backend-integration/databus-integration.md).

Until then, [VPS HTTPS device testing](vps-https-testing.md) (the installable
web build) is the way to get the app on a real device — it exercises the warm
path fully, just not native telemetry.
