// BOOTSTRAP — owned by Agent A2 per master-plan §9 (`types/*`).
// This file transcribes the FROZEN contract from master-plan §6.1 verbatim
// so `stores/auth.ts` (also a bootstrap, see that file) and `router/index.ts`
// (Agent A1) have real types to compile against. A2 owns this file going
// forward and may extend it, but must not break these signatures without
// updating §6.1 in the same change (master-plan §9 conflict-avoidance rule).

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

export interface Session {
  token: string;
  operatorId: string;
  firstName: string;
  lastName: string;
}

export interface ActiveRun {
  runId: string;
  vehicleId: string;
  routeId: string;
  tripId: string;
  directionId: number;
  shapeId: string;
  state: RunState;
}

export interface Fix {
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp?: number;
}
