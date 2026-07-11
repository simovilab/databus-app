import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const preferencesStore = new Map<string, string>();

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      preferencesStore.set(key, value);
    }),
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: preferencesStore.get(key) ?? null,
    })),
    remove: vi.fn(async ({ key }: { key: string }) => {
      preferencesStore.delete(key);
    }),
  },
}));

import { useSettingsStore } from '@/stores/settings';

describe('useSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    preferencesStore.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with sensible defaults', () => {
    const store = useSettingsStore();
    expect(store.settings.backgroundTelemetry).toBe(true);
    expect(store.settings.keepScreenOn).toBe(true);
    expect(store.settings.language).toBe('es');
    expect(store.settings.displayName).toBe('');
  });

  it('update() patches, persists, and keeps other keys', async () => {
    const store = useSettingsStore();
    await store.update({ language: 'en' });

    expect(store.settings.language).toBe('en');
    expect(store.settings.backgroundTelemetry).toBe(true);
    expect(preferencesStore.has('databus.settings')).toBe(true);
  });

  it('merges stored settings over defaults on load (new keys stay defined)', async () => {
    // Simulate storage written before `displayName` existed.
    preferencesStore.set(
      'databus.settings',
      JSON.stringify({ language: 'en', keepScreenOn: false }),
    );
    const store = useSettingsStore();
    await store.loadFromStorage();

    expect(store.settings.language).toBe('en');
    expect(store.settings.keepScreenOn).toBe(false);
    // Missing key falls back to its default rather than undefined.
    expect(store.settings.displayName).toBe('');
    expect(store.settings.backgroundTelemetry).toBe(true);
  });

  it('treats corrupt storage as defaults', async () => {
    preferencesStore.set('databus.settings', 'nope');
    const store = useSettingsStore();
    await store.loadFromStorage();

    expect(store.settings.language).toBe('es');
  });
});
