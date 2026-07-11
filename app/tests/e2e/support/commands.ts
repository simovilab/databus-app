/// <reference types="cypress" />

// Custom commands for the run-flow e2e smoke. Auth is seeded directly into
// the running app's Pinia instance because Agent A3's real LoginPage is not
// merged yet (SplashPage is a placeholder that always routes to /login).
// Once A3 lands the login form, replace `seedAuth` with a real UI login.

interface E2ESession {
  token: string;
  operatorId: string;
  firstName: string;
  lastName: string;
}

const SESSION: E2ESession = {
  token: 'e2e-token',
  operatorId: 'op-e2e',
  firstName: 'E2E',
  lastName: 'Operator',
};

interface VueApp {
  config: { globalProperties: { $pinia: { _s: Map<string, { $patch: (s: Partial<E2ESession>) => void }> }; $router: { replace: (to: string) => void } } };
}

/**
 * Seeds the auth store on the live Pinia instance so the router guard admits
 * /tabs/*, then navigates to the runs tab. Uses the Vue 3 dev-mode
 * `__vue_app__` handle on the mount element (available under vite dev, which
 * is what the e2e baseUrl points at). Requires the app to have booted first.
 */
function seedAuth(): Cypress.Chainable<void> {
  return cy
    .window()
    .should((win) => {
      const root = win.document.querySelector('#app');
      expect((root as unknown as { __vue_app__?: unknown })?.__vue_app__, 'vue app mounted').to
        .exist;
    })
    .then((win) => {
      const root = win.document.querySelector('#app') as unknown as {
        __vue_app__: VueApp;
      };
      const app = root.__vue_app__;
      const pinia = app.config.globalProperties.$pinia;
      const authStore = pinia._s.get('auth');
      if (!authStore) {
        throw new Error('auth store not registered in Pinia');
      }
      authStore.$patch({ ...SESSION });
      app.config.globalProperties.$router.replace('/tabs/runs');
    });
}

declare global {
  namespace Cypress {
    interface Chainable {
      seedAuth(): Cypress.Chainable<void>;
    }
  }
}

Cypress.Commands.add('seedAuth', seedAuth);

export {};
