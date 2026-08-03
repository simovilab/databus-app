// Domain types — the frozen shapes from master-plan.md §6.1.
// Do not change these signatures without updating plans/master-plan.md §6 in
// the same change (see plans/agents/agent-2-data-layer.md "Rules").

/**
 * Run lifecycle states, verified against
 * ../databus/backend/runs/domain/lifecycle/states.py (RunLifecycleStates).
 */
export type RunState =
  | 'Requested'
  | 'Validated'
  | 'Initialized'
  | 'Confirmed'
  | 'Tracking'
  | 'In Progress'
  | 'No Signal'
  | 'Completed'
  | 'Cancelled'
  | 'Interrupted'
  | 'Short Turned';

/** Authenticated operator session, persisted via @capacitor/preferences. */
export interface Session {
  token: string;
  operatorId: string;
  firstName: string;
  lastName: string;
}

/** The run currently owned by this device/operator. */
export interface ActiveRun {
  runId: string;
  vehicleId: string;
  routeId: string;
  tripId: string;
  directionId: number;
  shapeId: string;
  state: RunState;
  // Driver-facing labels captured at run creation (readable-labels plan §3) —
  // the destination is not encoded anywhere in tripId/shapeId, so no amount
  // of string parsing can recover it later. Required here because every
  // ActiveRun is created fresh by createRun(), which always has them.
  routeLabel: string; // "L1 · Sin milla"
  tripLabel: string; // "06:20 · desde Artes Plásticas → Deportivas"
}

/**
 * A finished run recorded in the local history log. The backend exposes no
 * "list my runs" endpoint (the run ViewSet is disabled), so the app keeps its
 * own append-only history in @capacitor/preferences, written when a run
 * reaches a terminal state. Per-run detail (the FSM timeline) is still fetched
 * live from GET /runs/<id>/history/.
 */
export interface RunHistoryEntry {
  runId: string;
  vehicleId: string;
  routeId: string;
  tripId: string;
  directionId: number;
  shapeId: string;
  finalState: RunState;
  startedAt: string; // ISO 8601, when the run was created on this device
  endedAt: string; // ISO 8601, when it reached a terminal state
  // Optional, unlike ActiveRun.routeLabel/tripLabel: entries already
  // persisted in Capacitor Preferences before this change have no labels.
  // Every consumer must fall back to the raw id rather than render blank.
  routeLabel?: string;
  tripLabel?: string;
}

/** A single GPS sample, ready to publish to the telemetry broker. */
export interface Fix {
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp?: number; // unix epoch seconds
}
