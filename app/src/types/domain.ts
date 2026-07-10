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
}

/** A single GPS sample, ready to publish to the telemetry broker. */
export interface Fix {
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp?: number; // unix epoch seconds
}
