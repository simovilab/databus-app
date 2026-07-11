// Settings store (Pinia setup store). Local, device-scoped app preferences
// persisted via @capacitor/preferences. These are UI/behaviour preferences the
// operator controls — distinct from the institutional profile, which comes
// read-only from the login (LDAP-backed) and has no client-side edit endpoint.

import { ref } from 'vue';
import { defineStore } from 'pinia';
import { Preferences } from '@capacitor/preferences';
import { applyPalette, watchColorScheme } from '@/theme/applyPalette';
import { DEFAULT_PALETTE_ID, getPalette } from '@/theme/palettes';

const STORAGE_KEY = 'databus.settings';

export interface AppSettings {
  // Optional local display-name override. The institutional identity
  // (first/last name, operatorId) comes read-only from the LDAP-backed login;
  // there is no profile-update endpoint, so this is a device-local nickname the
  // operator can set for the profile card. Empty = use the institutional name.
  displayName: string;
  // Keep telemetry running while the app is backgrounded / phone is locked.
  backgroundTelemetry: boolean;
  // Prevent the screen from sleeping while a run is active.
  keepScreenOn: boolean;
  // Interface language.
  language: 'es' | 'en';
  // Chosen color palette (see theme/palettes.ts). Applied on load and update.
  paletteId: string;
}

const DEFAULTS: AppSettings = {
  displayName: '',
  backgroundTelemetry: true,
  keepScreenOn: true,
  language: 'es',
  paletteId: DEFAULT_PALETTE_ID,
};

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULTS });

  async function loadFromStorage(): Promise<void> {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      try {
        const parsed = JSON.parse(value) as Partial<AppSettings>;
        // Merge over defaults so a newly-added key is never undefined.
        settings.value = { ...DEFAULTS, ...parsed };
      } catch {
        settings.value = { ...DEFAULTS };
      }
    }
    // Apply the (possibly stored) palette so the app boots in the chosen theme,
    // and keep the background/surface tokens in sync with OS light/dark changes.
    applyPalette(getPalette(settings.value.paletteId));
    watchColorScheme(() => getPalette(settings.value.paletteId));
  }

  async function update(patch: Partial<AppSettings>): Promise<void> {
    settings.value = { ...settings.value, ...patch };
    // Re-theme immediately when the palette changes.
    if (patch.paletteId !== undefined) {
      applyPalette(getPalette(settings.value.paletteId));
    }
    await Preferences.set({
      key: STORAGE_KEY,
      value: JSON.stringify(settings.value),
    });
  }

  return { settings, loadFromStorage, update };
});
