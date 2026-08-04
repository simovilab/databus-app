---
icon: lucide/network
---

# Architecture

How the app is put together: the system it lives in, how its screens connect,
where things live in the source tree, and the seam that lets the same
telemetry interface run two different ways in dev vs. production.

| Page | What you will find |
| --- | --- |
| [System context](system-context.md) | The app's place relative to `databus` and the telemetry broker; sibling repos |
| [Screens & navigation](screens-and-navigation.md) | The four bottom tabs and what each one does |
| [Project layout](project-layout.md) | Annotated source tree |
| [Telemetry seam (dev vs prod)](telemetry-seam.md) | `TelemetryRuntime`'s two implementations, and why the web build disables telemetry in production |
