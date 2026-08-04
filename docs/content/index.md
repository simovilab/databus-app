---
icon: lucide/smartphone
hide:
  - navigation
---

# Databús App

**`databus-app`** is the operator/on-board client for the **Databús** transit
system (UCR / SIMOVI). Bus drivers and fleet operators use it to start and end
runs, stream real-time GPS telemetry, and (later) receive operational messages
and raise service alerts.

The app is **two things at once**:

- **A mobile UI** that talks to the Databús orchestrator over a REST API — the
  low-frequency **"warm path"** (login, start/end run, lifecycle events).
- **An MQTT telemetry publisher** that streams GPS fixes to the Databús
  telemetry broker — the high-frequency **"hot path"** (position updates).

It has **no backend of its own** — every server-side concern lives in the
sibling [`databus`](https://github.com/simovilab/databus) repository. See
[System context](architecture/system-context.md) for how the pieces fit
together.

!!! note "This site vs the root README"

    The repo-root `README.md`, `HANDOFF.md`, and `DATABUS_INTEGRATION.md` are
    still the canonical source for fast-moving facts (test counts, open backend
    asks). This site organizes and expands on them for a docs audience — where
    they disagree, the root files win.

## Start here

<div class="grid cards" markdown>

-   :lucide-lightbulb:{ .lg .middle } **Concepts**

    ---

    What the app is, the run lifecycle it drives, and the hot-path/warm-path
    telemetry split.

    [:octicons-arrow-right-24: Concepts](concepts/index.md)

-   :lucide-network:{ .lg .middle } **Architecture**

    ---

    System context, screens & navigation, project layout, and the telemetry
    seam between dev and native builds.

    [:octicons-arrow-right-24: Architecture](architecture/index.md)

-   :lucide-layout-panel-top:{ .lg .middle } **App behavior**

    ---

    Trip setup and human-readable labels, theming & typography, the PWA, and
    what gets persisted on-device.

    [:octicons-arrow-right-24: App behavior](app-behavior/index.md)

-   :lucide-terminal:{ .lg .middle } **Development**

    ---

    Getting started, running the test suite, and the conventions this repo
    follows.

    [:octicons-arrow-right-24: Development](development/index.md)

-   :lucide-rocket:{ .lg .middle } **Deployment**

    ---

    Getting the web build onto a real device over HTTPS, and native
    (Android/iOS) builds.

    [:octicons-arrow-right-24: Deployment](deployment/index.md)

-   :lucide-plug:{ .lg .middle } **Backend integration**

    ---

    The contract this app relies on from `databus`, open asks, and known
    issues (including ones that live in the backend, not here).

    [:octicons-arrow-right-24: Backend integration](backend-integration/index.md)

</div>

---

Databús is developed by the [SIMOVI Lab](https://simovilab.org) at the
University of Costa Rica (UCR). Source:
[github.com/simovilab/databus-app](https://github.com/simovilab/databus-app).
