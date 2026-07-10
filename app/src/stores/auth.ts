// Auth store (Pinia setup store, master §6.2). Persists the session via
// @capacitor/preferences (JSON-encoded) — verified via /find-docs against
// /ionic-team/capacitor-docs (Preferences.set/get/remove).

import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { Preferences } from '@capacitor/preferences';
import { apiPost } from '@/services/apiClient';
import type { LoginResponse } from '@/types/api';
import type { Session } from '@/types/domain';

const STORAGE_KEY = 'databus.session';

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null);
  const isAuthenticated = computed(() => session.value !== null);

  async function login(username: string, password: string): Promise<void> {
    const response = await apiPost<LoginResponse>('/login/', { username, password });
    const newSession: Session = {
      token: response.token,
      operatorId: response.operator_id,
      firstName: response.first_name,
      lastName: response.last_name,
    };
    session.value = newSession;
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(newSession) });
  }

  async function logout(): Promise<void> {
    session.value = null;
    await Preferences.remove({ key: STORAGE_KEY });
  }

  async function loadFromStorage(): Promise<void> {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (!value) {
      return;
    }
    try {
      session.value = JSON.parse(value) as Session;
    } catch {
      // Corrupt storage value — treat as logged out rather than throwing
      // during app boot.
      session.value = null;
    }
  }

  return { session, isAuthenticated, login, logout, loadFromStorage };
});
