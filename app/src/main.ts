import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router';
import { useAuthStore } from '@/stores/auth';
import { useRunHistoryStore } from '@/stores/runHistory';
import { useSettingsStore } from '@/stores/settings';
import { registerServiceWorker } from '@/services/pwa';

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
/* @import '@ionic/vue/css/palettes/dark.class.css'; */
import '@ionic/vue/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

const pinia = createPinia();
const app = createApp(App).use(IonicVue).use(pinia);

/**
 * Rehydrate persisted stores from @capacitor/preferences, then install the
 * router and mount.
 *
 * Order matters: installing the router (`app.use(router)`) immediately kicks
 * off the initial navigation and its `beforeEach` auth guard. If that runs
 * before the session is loaded, the guard sees `isAuthenticated === false` and
 * redirects to /login — which is exactly the "refresh bounces me to login"
 * bug. So we `await` the Preferences reads FIRST, then install the router.
 *
 * On native there is no page refresh, but the same path runs on every cold
 * start (app killed → relaunched), where Preferences is real OS-backed storage
 * (Android SharedPreferences / iOS UserDefaults) — so a returning operator
 * lands straight in the app without re-logging in.
 *
 * Each read is independent and non-fatal: the stores already treat a
 * corrupt/failed value as "logged out" / defaults, so a bad read must not
 * block boot.
 */
async function bootstrap(): Promise<void> {
  const auth = useAuthStore(pinia);
  const runHistory = useRunHistoryStore(pinia);
  const settings = useSettingsStore(pinia);
  await Promise.all([
    auth.loadFromStorage().catch(() => undefined),
    runHistory.loadFromStorage().catch(() => undefined),
    settings.loadFromStorage().catch(() => undefined),
  ]);
}

bootstrap()
  .catch(() => undefined)
  .finally(() => {
    app.use(router);
    router.isReady().then(() => {
      app.mount('#app');
      // After mount, and deliberately not awaited: the service worker is a
      // progressive enhancement for the web/PWA build, so it must never delay
      // first paint or fail boot. No-ops on native (see services/pwa.ts).
      void registerServiceWorker().catch(() => undefined);
    });
  });
