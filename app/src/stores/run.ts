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
import { useRunHistoryStore } from '@/stores/runHistory';
import type { ActiveRun, RunState } from '@/types/domain';
import type {
  CreateRunInput,
  CreateRunResponse,
  RunStateResponse,
  RunUpdateResponse,
} from '@/types/api';

/**
 * Operator-sendable events for endRun(). The FSM (verified against
 * ../databus/backend/runs/domain/lifecycle/transitions.py) only lets the
 * *operator* leave an active run two ways:
 *   - cancel_run       — from Initialized/Confirmed/Tracking (before the bus is
 *                        under way). Frees vehicle/operator/trip.
 *   - run_interrupted  — from In Progress / No Signal (bus already moving).
 * run_completed is a *system* event: it requires is_at_terminal_stop (a stop_id
 * matching the trip terminal) and is fired by the realtime engine when
 * telemetry reaches the end — the app must never send it, or the update 422s.
 * Both operator events require actor_role="operator" in details.
 */
type EndRunEvent = 'cancel_run' | 'run_interrupted';

/** Run states where the vehicle is already under way (manual end = interrupt). */
const IN_MOTION_STATES: ReadonlySet<RunState> = new Set<RunState>([
  'In Progress',
  'No Signal',
]);

/**
 * Terminal states — the run is over and belongs in history. Includes states the
 * *system* reaches without an operator action: `Completed` (realtime engine at
 * the terminal stop) and `Cancelled` (e.g. RUN_TRACKING_EXPIRED from No Signal),
 * as well as the operator-driven `Interrupted` / `Short Turned`.
 */
const TERMINAL_STATES: ReadonlySet<RunState> = new Set<RunState>([
  'Completed',
  'Cancelled',
  'Interrupted',
  'Short Turned',
]);

export const useRunStore = defineStore('run', () => {
  const activeRun = ref<ActiveRun | null>(null);
  // When the current run was created on this device (ISO 8601). Used to stamp
  // the run-history entry written on endRun().
  const startedAt = ref<string | null>(null);
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
    startedAt.value = new Date().toISOString();

    // Start telemetry in the background: the run is already created + confirmed
    // (the operator-facing outcome), so createRun() must resolve now and let the
    // caller close the setup UI. Telemetry surfaces its own health via
    // telemetry.status (streaming/buffering/error) — a broker being briefly
    // unreachable must never block or fail run creation, nor trap the operator
    // in the setup modal. Errors are swallowed here; the runtime already
    // reflects them in status.
    void telemetry.start({ vehicleId: input.vehicle_id }).catch(() => undefined);
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
    // A run can reach a terminal state without any operator action — the
    // realtime engine completes it at the terminal stop (Completed), or expires
    // it from No Signal (Cancelled). Polling is where the app observes that, so
    // stop telemetry and record history here too. Both are idempotent
    // (record() de-dupes by runId; telemetry.stop() is safe to re-call), so
    // this coexists with endRun() for the operator-driven paths.
    if (TERMINAL_STATES.has(state)) {
      await telemetry.stop().catch(() => undefined);
      await recordToHistory(state);
    }
    return state;
  }

  /**
   * Append the active run to the local history log (backend has no run-list
   * endpoint). Best-effort and idempotent: record() de-dupes by runId, so
   * calling it from both endRun() and refreshState() records a run exactly
   * once. A persistence failure must never break the run flow.
   */
  async function recordToHistory(finalState: RunState): Promise<void> {
    const run = activeRun.value;
    if (!run) return;
    try {
      await useRunHistoryStore().record({
        runId: run.runId,
        vehicleId: run.vehicleId,
        routeId: run.routeId,
        tripId: run.tripId,
        directionId: run.directionId,
        shapeId: run.shapeId,
        finalState,
        startedAt: startedAt.value ?? new Date().toISOString(),
        endedAt: new Date().toISOString(),
      });
    } catch {
      // swallow — history is a convenience, not part of the run contract
    }
  }

  /**
   * Operator manually ends the active run, then stops telemetry and records
   * history. The event is chosen from the current lifecycle state to match the
   * FSM: a run already under way (In Progress / No Signal) is `run_interrupted`;
   * anything earlier is `cancel_run`. Callers may override `event` explicitly.
   * Both carry actor_role="operator" so the authorization guards pass.
   */
  async function endRun(event?: EndRunEvent): Promise<void> {
    if (!activeRun.value) {
      throw new Error('endRun() called with no active run');
    }
    const resolvedEvent: EndRunEvent =
      event ??
      (IN_MOTION_STATES.has(activeRun.value.state) ? 'run_interrupted' : 'cancel_run');
    const response = await apiPost<RunUpdateResponse>(
      `/runs/${activeRun.value.runId}/update/`,
      { event: resolvedEvent, details: { actor_role: 'operator' } }
    );
    const finalState = response.run_lifecycle_state as RunState;
    activeRun.value = {
      ...activeRun.value,
      state: finalState,
    };
    await telemetry.stop();
    await recordToHistory(finalState);
  }

  return { activeRun, startedAt, createRun, refreshState, endRun, telemetry };
});
