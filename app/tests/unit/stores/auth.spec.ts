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

import { useAuthStore } from '@/stores/auth';

function jsonResponse(body: unknown, status = 200, ok = status >= 200 && status < 300) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    preferencesStore.clear();
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/api');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts unauthenticated', () => {
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
    expect(store.session).toBeNull();
  });

  it('login() stores the session and persists it', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        token: 'tok-1',
        operator_id: 'op-42',
        first_name: 'Ada',
        last_name: 'Lovelace',
      })
    );

    const store = useAuthStore();
    await store.login('ada', 'secret');

    expect(store.isAuthenticated).toBe(true);
    expect(store.session).toEqual({
      token: 'tok-1',
      operatorId: 'op-42',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(preferencesStore.get('databus.session')).toBe(
      JSON.stringify(store.session)
    );
  });

  it('login() rejects and leaves the store unauthenticated on bad credentials', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: 'Usuario o contraseña incorrectos' }, 400, false)
    );

    const store = useAuthStore();
    await expect(store.login('ada', 'wrong')).rejects.toMatchObject({ status: 400 });
    expect(store.isAuthenticated).toBe(false);
  });

  it('logout() clears the store and storage', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ token: 't', operator_id: 'o', first_name: 'A', last_name: 'B' })
    );
    const store = useAuthStore();
    await store.login('a', 'b');
    expect(store.isAuthenticated).toBe(true);

    await store.logout();

    expect(store.isAuthenticated).toBe(false);
    expect(store.session).toBeNull();
    expect(preferencesStore.has('databus.session')).toBe(false);
  });

  it('loadFromStorage() rehydrates a persisted session', async () => {
    preferencesStore.set(
      'databus.session',
      JSON.stringify({
        token: 'persisted',
        operatorId: 'op-9',
        firstName: 'Grace',
        lastName: 'Hopper',
      })
    );

    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);

    await store.loadFromStorage();

    expect(store.isAuthenticated).toBe(true);
    expect(store.session?.token).toBe('persisted');
  });

  it('loadFromStorage() is a no-op when nothing is stored', async () => {
    const store = useAuthStore();
    await store.loadFromStorage();
    expect(store.isAuthenticated).toBe(false);
  });

  it('loadFromStorage() treats corrupt storage as logged out', async () => {
    preferencesStore.set('databus.session', '{not json');
    const store = useAuthStore();
    await store.loadFromStorage();
    expect(store.session).toBeNull();
  });
});
