# PWA (installable web build)

The web build ships a manifest + service worker, so it can be installed to a
phone's home screen and tested on real devices over HTTPS with no app-store
involvement (see
[VPS HTTPS device testing](../deployment/vps-https-testing.md)).

**It is a testing/demo vehicle for the warm path, not a production target.** A
PWA gets no background GPS — fixes stop when the screen locks — and no
reachable broker (see
[Telemetry seam](../architecture/telemetry-seam.md#vite_telemetry_enabledfalse-the-web-build-has-no-broker)).
Real telemetry is the native build's job, permanently.

## Three constraints worth knowing before touching `vite.config.ts`

- **`navigateFallbackDenylist: [/^\/api/]`** — the app is deliberately
  same-origin (`VITE_API_BASE_URL=/api`), so without this Workbox's navigation
  fallback answers API paths with `index.html`. There is no `runtimeCaching`
  for `/api` either, by omission and on purpose: these are live run-lifecycle
  FSM reads, and showing an operator a stale run state is worse than showing
  an error.
- **`registerType: 'prompt'`, not `'autoUpdate'`** — autoUpdate reloads the
  page when a new SW activates. The active run lives only in the Pinia run
  store (resume-on-boot is still open work — see
  [Persistence](persistence.md)), so that would silently drop a run mid-trip.
  Updates wait and land on the next cold start.
- **Registration is web-only** (`src/services/pwa.ts`, `injectRegister:
  null`) — `capacitor.config.ts` uses `webDir: 'dist'`, so this same build is
  packaged into the Capacitor webview, where a SW hijacks local app assets and
  strands the native app on a precache a store update cannot dislodge.

## Icons

Icons in `public/pwa/` derive from the "b" mark's cyan (`#00c0f3`), not the
wordmark green (`#6dc067`) — the two brand assets disagree and the mark owns
the install identity. The maskable variant is knocked out (solid field, white
"b", no ring) because the source mark is full-bleed and Android crops to the
inner ~80%.
