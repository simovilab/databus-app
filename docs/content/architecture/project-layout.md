# Project layout

```
app/
  src/
    views/            # one page per screen (Splash, Login, Home, Runs, Messages, User…)
    components/
      trips/          # TripSetupModal (run wizard), RunProgress
      runs/           # RunHistoryList, RunDetailsModal
      user/           # ProfileEditModal
      ui/             # AppError, AppLoading, EmptyState, BrandLogo
    stores/           # Pinia: auth, run, runHistory, settings
    services/
      apiClient.ts    # typed fetch wrapper (Token auth, error envelopes)
      schedule.ts     # GTFS/run REST lookups
      geolocation.ts  # GPS watcher (Capacitor native / browser fallback)
      pwa.ts          # service-worker registration (web only; no-op on native)
      telemetry/      # TelemetryRuntime seam + web & native implementations
    theme/            # variables.css + palettes.ts + applyPalette.ts (theming)
    utils/
      labels.ts       # GTFS id → human-readable route/trip labels for drivers
    types/            # api.ts (wire types), domain.ts (app types)
    router/           # routes + auth guard
  public/
    logo/             # Databús wordmark (dark/light) + "b" mark; favicon
    pwa/              # generated PWA icons (192, 512, maskable 512, apple 180)
  plugins/
    capacitor-databus-telemetry/   # native TCP+TLS MQTT plugin (Kotlin + Swift)
  tests/
    unit/             # vitest
    e2e/              # cypress
plans/                # master-plan.md + per-agent briefs
SITEMAP.md            # navigation spec
DATABUS_INTEGRATION.md# backend contract + open asks for the databus team
```

Kept in sync with the repo-root `README.md`'s own copy of this tree — update
both in the same change.
