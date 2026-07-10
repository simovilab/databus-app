// BOOTSTRAP — owned by Agent A2 per master-plan §9 (`stores/*`).
//
// A1 (app shell) added this minimal implementation only so the global
// router guard (src/router/index.ts) and `npm run dev` have a real
// `useAuthStore()` to compile and run against — the shell's Definition of
// Done requires the app to actually navigate Splash -> Login -> Tabs, which
// is impossible without *some* store existing at this path.
//
// This matches the FROZEN signature in master-plan §6.2 exactly:
//   session, isAuthenticated, login(), logout(), loadFromStorage()
// A2 replaces the body with the real implementation (POST /api/login/ via
// services/apiClient.ts, Capacitor Preferences persistence per §3.1) without
// changing the public shape, so nothing that imports this store should need
// to change when A2 lands the real version.
import { defineStore } from 'pinia';
import { Preferences } from '@capacitor/preferences';
import { computed, ref } from 'vue';
import type { Session } from '@/types/domain';

const STORAGE_KEY = 'databus.session';

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null);
  const isAuthenticated = computed(() => session.value !== null);

  async function login(username: string, password: string): Promise<void> {
    // Real implementation (A2): POST /api/login/ via services/apiClient.ts,
    // then persist the returned Session via Preferences.
    if (!username || !password) throw new Error('Username and password are required.');
    throw new Error(`Not implemented: Agent A2 wires up login for "${username}" to POST /api/login/.`);
  }

  async function logout(): Promise<void> {
    session.value = null;
    await Preferences.remove({ key: STORAGE_KEY });
  }

  async function loadFromStorage(): Promise<void> {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (!value) return;
    try {
      session.value = JSON.parse(value) as Session;
    } catch {
      session.value = null;
    }
  }

  return { session, isAuthenticated, login, logout, loadFromStorage };
});
