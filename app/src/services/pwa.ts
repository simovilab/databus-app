// Service worker registration — web only.
//
// Same seam idea as services/telemetry/runtime.ts and services/geolocation.ts:
// one entry point, platform-selected behaviour. Here the native branch is simply
// "do nothing".
//
// Registration is manual (vite.config.ts sets injectRegister: null) precisely so
// this guard exists. capacitor.config.ts uses `webDir: 'dist'`, so the very same
// build that is served as a PWA is also packaged into the Capacitor webview —
// and a service worker inside that webview intercepts the local app:// assets it
// was never meant to own, which strands the native app on a stale precache that
// a store update cannot dislodge. The web build wants a SW; the native build
// must never have one.

import { Capacitor } from '@capacitor/core';

/**
 * Registers the service worker on web; a no-op on native.
 *
 * Returns whether registration was attempted, which is what the unit test
 * asserts on (the SW itself can't run under jsdom).
 *
 * Update policy: the generated SW uses registerType 'prompt', so a new version
 * installs and then WAITS rather than taking over a live page. There is no
 * refresh prompt yet, so an update activates on the next cold start. That is the
 * safe default here — an active run lives only in the Pinia run store and cannot
 * yet be resumed, so a mid-run takeover would lose it.
 * TODO: surface an Ionic toast on need-refresh so testers can opt into an update
 * without fully closing the app.
 */
export async function registerServiceWorker(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    return false;
  }

  // Dynamic import: `virtual:pwa-register` is a build-time virtual module and
  // does not resolve under vitest/jsdom, so it must not be a top-level import.
  const { registerSW } = await import('virtual:pwa-register');
  registerSW({ immediate: true });
  return true;
}
