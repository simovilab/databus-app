# Subagent A1 — App Shell & Design System

## Required reading (in order)
1. `plans/master-plan.md` — the whole thing, but you **own** §5 (layout), §6.4 (routes), §6.5 (design tokens), §7 (env), §9 (parallelization rules).
2. Current scaffold: `app/src/` (stock Ionic tabs starter — you will replace it), `app/package.json`, `app/capacitor.config.ts`, `app/src/theme/variables.css`.
3. The Databús logo/brand reference in the root `README.md` and `SITEMAP.md` (Ionic component conventions, "cada espacio de edición es un modal").

## Your mission
Turn the stock Ionic starter into the **application shell** every other agent plugs into: navigation, theme, shared UI, dependencies, and config. When you are done the app must **compile and boot to a Splash → Login → Tabs flow with placeholder pages**, so A2/A3/A4 have real mount points.

## Scope — files you OWN (only edit these)
- `app/src/main.ts` — `createApp`, install `IonicVue`, `pinia`, `router`; import Ionic CSS.
- `app/src/App.vue` — `<ion-app><ion-router-outlet/></ion-app>`.
- `app/src/router/index.ts` — routes + names per master §6.4 (`/`, `/login`, `/tabs/home|trips|profile`) and a **global auth guard** using `useAuthStore().isAuthenticated` (import the store; it's fine if its impl lands later — code against the signature in §6.2).
- `app/src/views/TabsPage.vue` — `<ion-tabs>` shell with bottom `ion-tab-bar`: Home, Trips, Profile (ionicons). Use the **router-based tabs** pattern already in the scaffold.
- `app/src/theme/variables.css` (+ optional `theme/tokens.css`) — Databús brand palette as Ionic CSS vars (`--ion-color-primary` and friends) plus a few `--app-*` spacing/radius tokens. Support light + dark.
- `app/src/components/ui/AppLoading.vue`, `AppError.vue`, `EmptyState.vue` — small, reusable, prop-driven (`AppError` takes an `error` prop and renders a friendly message).
- `app/capacitor.config.ts` — set a real `appId` (e.g. `org.simovi.databus.app`), `appName`, `webDir: 'dist'`.
- **Native permission entries** (needed for background telemetry — A5 depends on these):
  - iOS `Info.plist`: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, and the **background modes** `location` (+ `processing`/`fetch` as A5 requires) — coordinate the exact keys with A5.
  - Android `AndroidManifest.xml`: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `INTERNET`, `POST_NOTIFICATIONS` (foreground-service notification).
  - If the native `android/`/`ios/` projects aren't generated yet, record these in a `NATIVE-PERMISSIONS.md` A5 will apply when it runs `npx cap add`. Do not hardcode secrets. This is a **standalone Capacitor** app — permissions go in the native manifests/plist directly, **not** ODC build actions.
- `app/.env.example` — `VITE_API_BASE_URL=http://localhost:8000/api` and `VITE_MQTT_URL=ws://localhost:8083/mqtt`. Ensure `.env` is gitignored (it already is at repo root; confirm `app/.gitignore`).
- `app/package.json` — **add deps:** `pinia`, `@capacitor/geolocation`, `@capacitor/preferences`; verify `mqtt` is present (added in commit `c1037b0`) and add it if missing. Run `npm install`.

## Placeholders you create (A3/A4 replace them)
`views/SplashPage.vue`, `views/LoginPage.vue`, `views/HomePage.vue`, `views/ProfilePage.vue`, `views/TripsPage.vue` — each a minimal `<ion-page>` with a title, so routes resolve and the app builds. Delete the old `Tab1Page.vue`, `Tab2Page.vue`, `Tab3Page.vue`, and `components/ExploreContainer.vue` once routes are migrated.

## Rules
- Do **not** implement business logic, API calls, MQTT, or feature-page internals — that's A2/A3/A4.
- `main.ts`, `router/index.ts`, `package.json` are yours alone; if another agent needs a route/dep, they'll note it for you.
- `<script setup lang="ts">`; files < 400 lines; theme must work in light and dark; no hardcoded secrets.
- **Skills (see master §3.2):** use `/ionic` for Ionic component/navigation/theming guidance and Capacitor shell setup, and `/find-docs` (`/ionic-team/ionic-docs`, `/ionic-team/capacitor-docs`) for exact Ionic 8 tabs/router and Capacitor config APIs — don't rely on memory. Do **not** run `/capacitor-plugin-generator` or `/build-actions-generator` (out of scope for v0; the latter is ODC-only).

## Definition of done
- `npm run dev` boots; you can navigate Splash → Login → Tabs (Home/Trips/Profile) with placeholders.
- `npm run lint` and `npm run build` (vue-tsc) pass.
- Report: what you changed, the exact route table + token names + shared component props (so A3/A4 can consume them), and any deps you added.
