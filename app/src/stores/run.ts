// Run store (Pinia setup store, master §6.2 + §6.6). Owns the TelemetryRuntime
// instance for the lifetime of the store — start() is called from
// createRun() once the run is Confirmed (telemetry is dropped server-side
// before that), stop() is called from endRun() on any terminal outcome.
// This is deliberate: the driver may background the app or lock the phone,
// so telemetry must not be tied to RunProgress being mounted.

import { markRaw, ref } from 'vue';
import { defineStore } from 'pinia';
import { apiGet, apiPost } from '@/services/apiClient';
import { createTelemetryRuntime } from '@/services/telemetry/runtime';
import type { ActiveRun, RunState } from '@/types/domain';
import type {
  CreateRunInput,
  CreateRunResponse,
  RunStateResponse,
  RunUpdateResponse,
} from '@/types/api';

/**
 * Events accepted by endRun() per master §6.2's frozen signature. `run_completed`
 * is the v0 default (R4, resolved 2026-07-10 — manual completion is a
 * supported operator path on /update/); `run_interrupted` stays available so
 * later UI can wire it without a store change.
 */
type EndRunEvent = 'run_completed' | 'run_interrupted';

export const useRunStore = defineStore('run', () => {
  const activeRun = ref<ActiveRun | null>(null);
  // markRaw: Pinia wraps the store in reactive(), which would otherwise
  // recursively proxy this object and auto-unwrap its nested refs
  // (status/lastFix/queuedCount), breaking the Ref<T> contract that
  // TelemetryRuntime promises to callers like runStore.telemetry.status.value.
  // The runtime already manages its own reactivity internally.
  const telemetry = markRaw(createTelemetryRuntime());

  /**
   * POST /create-run/ → POST /runs/<id>/update/ {event:"run_confirmed_by_operator"}
   * → telemetry.start({vehicleId}). Confirm event is `run_confirmed_by_operator`,
   * NOT `run_confirmed` — verified against RunLifecycleEvents.
   */
  async function createRun(input: CreateRunInput): Promise<void> {
    const created = await apiPost<CreateRunResponse>('/create-run/', input);
    const confirmed = await apiPost<RunUpdateResponse>(
      `/runs/${created.run_id}/update/`,
      { event: 'run_confirmed_by_operator' }
    );

    activeRun.value = {
      runId: created.run_id,
      vehicleId: input.vehicle_id,
      routeId: input.route_id,
      tripId: input.trip_id,
      directionId: input.direction_id,
      shapeId: input.shape_id,
      state: confirmed.run_lifecycle_state as RunState,
    };

    await telemetry.start({ vehicleId: input.vehicle_id });
  }

  /** GET /runs/<id>/state/ — polled by the UI (~5s) to display live progress. */
  async function refreshState(): Promise<RunState> {
    if (!activeRun.value) {
      throw new Error('refreshState() called with no active run');
    }
    const response = await apiGet<RunStateResponse>(
      `/runs/${activeRun.value.runId}/state/`
    );
    const state = response.run_lifecycle_state as RunState;
    activeRun.value = { ...activeRun.value, state };
    return state;
  }

  /**
   * POST /runs/<id>/update/ {event} → telemetry.stop(). Defaults to
   * `run_completed` (R4); pass `run_interrupted` for the deferred UI path.
   */
  async function endRun(event: EndRunEvent = 'run_completed'): Promise<void> {
    if (!activeRun.value) {
      throw new Error('endRun() called with no active run');
    }
    const response = await apiPost<RunUpdateResponse>(
      `/runs/${activeRun.value.runId}/update/`,
      { event }
    );
    activeRun.value = {
      ...activeRun.value,
      state: response.run_lifecycle_state as RunState,
    };
    await telemetry.stop();
  }

  return { activeRun, createRun, refreshState, endRun, telemetry };
});
