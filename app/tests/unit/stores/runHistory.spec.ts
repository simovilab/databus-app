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

const getRunState = vi.fn();
vi.mock('@/services/schedule', () => ({
  getRunState: (runId: string) => getRunState(runId),
}));

import { useRunHistoryStore } from '@/stores/runHistory';
import { ApiError } from '@/services/apiClient';
import type { RunHistoryEntry } from '@/types/domain';

function entry(overrides: Partial<RunHistoryEntry> = {}): RunHistoryEntry {
  return {
    runId: 'run-1',
    vehicleId: 'veh-001',
    routeId: 'bUCR_L1',
    tripId: 'trip-1',
    directionId: 0,
    shapeId: 'shape-1',
    finalState: 'Completed',
    startedAt: '2026-07-10T08:00:00.000Z',
    endedAt: '2026-07-10T08:30:00.000Z',
    ...overrides,
  };
}

describe('useRunHistoryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    preferencesStore.clear();
    getRunState.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records entries newest-first and persists them', async () => {
    const store = useRunHistoryStore();
    await store.record(entry({ runId: 'run-1' }));
    await store.record(entry({ runId: 'run-2' }));

    expect(store.entries.map((e) => e.runId)).toEqual(['run-2', 'run-1']);
    // Persisted to Preferences under the history key.
    expect(preferencesStore.has('databus.runHistory')).toBe(true);
  });

  it('de-duplicates by runId, moving the re-recorded run to the front', async () => {
    const store = useRunHistoryStore();
    await store.record(entry({ runId: 'run-1' }));
    await store.record(entry({ runId: 'run-2' }));
    await store.record(entry({ runId: 'run-1', finalState: 'Cancelled' }));

    expect(store.entries.map((e) => e.runId)).toEqual(['run-1', 'run-2']);
    expect(store.entries[0].finalState).toBe('Cancelled');
  });

  it('rehydrates entries from storage', async () => {
    preferencesStore.set(
      'databus.runHistory',
      JSON.stringify([entry({ runId: 'run-9' })]),
    );
    const store = useRunHistoryStore();
    await store.loadFromStorage();

    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].runId).toBe('run-9');
  });

  it('treats corrupt storage as empty', async () => {
    preferencesStore.set('databus.runHistory', '{not valid json');
    const store = useRunHistoryStore();
    await store.loadFromStorage();

    expect(store.entries).toEqual([]);
  });

  it('clear() empties the log and storage', async () => {
    const store = useRunHistoryStore();
    await store.record(entry());
    await store.clear();

    expect(store.entries).toEqual([]);
    expect(preferencesStore.has('databus.runHistory')).toBe(false);
  });

  it('reconcile() drops entries whose run 404s and refreshes surviving states', async () => {
    const store = useRunHistoryStore();
    await store.record(entry({ runId: 'gone' }));
    await store.record(entry({ runId: 'alive', finalState: 'Interrupted' }));

    getRunState.mockImplementation(async (runId: string) => {
      if (runId === 'gone') throw new ApiError(404, { run_id: 'Run not found' });
      return { status: 'success', run_lifecycle_state: 'Completed' };
    });

    await store.reconcile();

    expect(store.entries.map((e) => e.runId)).toEqual(['alive']);
    // Surviving entry's finalState refreshed from the DB.
    expect(store.entries[0].finalState).toBe('Completed');
  });

  it('reconcile() keeps entries on a transient (non-404) error', async () => {
    const store = useRunHistoryStore();
    await store.record(entry({ runId: 'run-1' }));

    getRunState.mockRejectedValue(new ApiError(0, { detail: 'Network request failed' }));

    await store.reconcile();

    expect(store.entries.map((e) => e.runId)).toEqual(['run-1']);
  });
});
