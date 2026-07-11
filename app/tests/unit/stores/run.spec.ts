import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// Plain { value } holders (not real Vue refs) — vi.hoisted runs before any
// import (including 'vue') is evaluated, and markRaw() in the store means
// these objects reach the store by identity, so genuine reactivity isn't
// needed for these assertions.
const { fakeTelemetry, recordSpy } = vi.hoisted(() => {
  const fakeTelemetry = {
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    status: { value: 'idle' },
    lastFix: { value: null as unknown },
    queuedCount: { value: 0 },
  };
  return { fakeTelemetry, recordSpy: vi.fn(async () => {}) };
});

vi.mock('@/services/telemetry/runtime', () => ({
  createTelemetryRuntime: () => fakeTelemetry,
}));

vi.mock('@/stores/runHistory', () => ({
  useRunHistoryStore: () => ({ record: recordSpy }),
}));

import { useRunStore } from '@/stores/run';
import type { CreateRunInput } from '@/types/api';

function jsonResponse(body: unknown, status = 200, ok = status >= 200 && status < 300) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

const input: CreateRunInput = {
  vehicle_id: 'veh-1',
  operator_id: 'op-1',
  route_id: 'route-1',
  trip_id: 'trip-1',
  direction_id: 0,
  shape_id: 'shape-1',
  schedule_relationship: 'SCHEDULED',
};

describe('useRunStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/api');
    vi.stubGlobal('fetch', vi.fn());
    fakeTelemetry.start.mockClear();
    fakeTelemetry.stop.mockClear();
    recordSpy.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('createRun() creates, confirms with run_confirmed_by_operator, and starts telemetry', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_id: 'run-1', run_lifecycle_state: 'Initialized' })
      )
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_lifecycle_state: 'Confirmed' })
      );

    const store = useRunStore();
    await store.createRun(input);

    expect(store.activeRun).toEqual({
      runId: 'run-1',
      vehicleId: 'veh-1',
      routeId: 'route-1',
      tripId: 'trip-1',
      directionId: 0,
      shapeId: 'shape-1',
      state: 'Confirmed',
    });

    // create-run call
    const [createUrl] = fetchMock.mock.calls[0];
    expect(createUrl).toBe('http://localhost:8000/api/create-run/');
    // confirm call — exact event string, NOT "run_confirmed"
    const [confirmUrl, confirmInit] = fetchMock.mock.calls[1];
    expect(confirmUrl).toBe('http://localhost:8000/api/runs/run-1/update/');
    expect(JSON.parse(confirmInit.body as string)).toEqual({
      event: 'run_confirmed_by_operator',
    });

    expect(fakeTelemetry.start).toHaveBeenCalledWith({ vehicleId: 'veh-1' });
  });

  it('createRun() resolves even when telemetry.start rejects (broker unreachable)', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_id: 'run-1', run_lifecycle_state: 'Initialized' })
      )
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_lifecycle_state: 'Confirmed' })
      );
    // Telemetry fails to connect — the run is still created + confirmed, so
    // createRun() must NOT reject (regression: modal froze on a hung/failed
    // telemetry start).
    fakeTelemetry.start.mockRejectedValueOnce(new Error('broker unreachable'));

    const store = useRunStore();
    await expect(store.createRun(input)).resolves.toBeUndefined();
    expect(store.activeRun?.state).toBe('Confirmed');
  });

  it('refreshState() GETs the run state and updates activeRun', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_id: 'run-1', run_lifecycle_state: 'Initialized' })
      )
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_lifecycle_state: 'Confirmed' })
      )
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_lifecycle_state: 'Tracking' })
      );

    const store = useRunStore();
    await store.createRun(input);
    const state = await store.refreshState();

    expect(state).toBe('Tracking');
    expect(store.activeRun?.state).toBe('Tracking');
    const [stateUrl] = fetchMock.mock.calls[2];
    expect(stateUrl).toBe('http://localhost:8000/api/runs/run-1/state/');
    // A non-terminal poll does not record history.
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('refreshState() records history + stops telemetry when the system completes a run', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_id: 'run-1', run_lifecycle_state: 'Initialized' })
      )
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_lifecycle_state: 'Confirmed' })
      )
      // The realtime engine completed the run at the terminal stop — the app
      // observes it via polling, with no operator action.
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_lifecycle_state: 'Completed' })
      );

    const store = useRunStore();
    await store.createRun(input);
    fakeTelemetry.stop.mockClear();
    const state = await store.refreshState();

    expect(state).toBe('Completed');
    expect(fakeTelemetry.stop).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy.mock.calls[0][0]).toMatchObject({
      runId: 'run-1',
      finalState: 'Completed',
    });
  });

  it('refreshState() throws when there is no active run', async () => {
    const store = useRunStore();
    await expect(store.refreshState()).rejects.toThrow('no active run');
  });

  it('endRun() cancels a not-yet-moving run (cancel_run + actor_role)', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_id: 'run-1', run_lifecycle_state: 'Initialized' })
      )
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_lifecycle_state: 'Confirmed' })
      )
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_lifecycle_state: 'Cancelled' })
      );

    const store = useRunStore();
    await store.createRun(input); // leaves the run in Confirmed (not moving)
    await store.endRun();

    expect(store.activeRun?.state).toBe('Cancelled');
    const [, endInit] = fetchMock.mock.calls[2];
    expect(JSON.parse(endInit.body as string)).toEqual({
      event: 'cancel_run',
      details: { actor_role: 'operator' },
    });
    expect(fakeTelemetry.stop).toHaveBeenCalledTimes(1);
  });

  it('endRun() interrupts a run already under way (In Progress → run_interrupted)', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_id: 'run-1', run_lifecycle_state: 'Initialized' })
      )
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_lifecycle_state: 'Confirmed' })
      )
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_lifecycle_state: 'In Progress' })
      )
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_lifecycle_state: 'Interrupted' })
      );

    const store = useRunStore();
    await store.createRun(input);
    await store.refreshState(); // advances local state to In Progress
    await store.endRun();

    expect(store.activeRun?.state).toBe('Interrupted');
    const [, endInit] = fetchMock.mock.calls[3];
    expect(JSON.parse(endInit.body as string)).toEqual({
      event: 'run_interrupted',
      details: { actor_role: 'operator' },
    });
  });

  it('endRun() honors an explicit event override', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_id: 'run-1', run_lifecycle_state: 'Initialized' })
      )
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_lifecycle_state: 'Confirmed' })
      )
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', run_lifecycle_state: 'Interrupted' })
      );

    const store = useRunStore();
    await store.createRun(input);
    await store.endRun('run_interrupted');

    const [, endInit] = fetchMock.mock.calls[2];
    expect(JSON.parse(endInit.body as string)).toEqual({
      event: 'run_interrupted',
      details: { actor_role: 'operator' },
    });
  });

  it('endRun() throws when there is no active run', async () => {
    const store = useRunStore();
    await expect(store.endRun()).rejects.toThrow('no active run');
  });

  it('exposes the telemetry runtime for read-only UI consumption', () => {
    const store = useRunStore();
    expect(store.telemetry).toBe(fakeTelemetry);
  });
});
