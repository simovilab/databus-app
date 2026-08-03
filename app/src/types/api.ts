// REST payload / response types for the Databús orchestrator API.
// Verified against ../databus/backend/api/{urls,views,serializers}.py
// (2026-07-10). Base URL: import.meta.env.VITE_API_BASE_URL (e.g.
// http://localhost:8000/api).

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** POST /login/ request body. */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * POST /login/ 200 response.
 * NOTE: LoginView returns first_name/last_name in addition to the fields
 * declared on LoginSerializer (token, operator_id) — verified in views.py.
 */
export interface LoginResponse {
  token: string;
  operator_id: string;
  first_name: string;
  last_name: string;
}

// ---------------------------------------------------------------------------
// GTFS schedule lookups (routes / service / shapes / trips / vehicles)
// ---------------------------------------------------------------------------

/**
 * GET /routes/ list item. RouteSerializer is fields="__all__" on the GTFS
 * Route model (DRF HyperlinkedModelSerializer) — only the fields the app
 * actually reads are named explicitly; unknown GTFS fields pass through.
 */
export interface Route {
  url?: string;
  id: number;
  route_id: string;
  agency_id?: string;
  route_short_name?: string;
  route_long_name?: string;
  route_desc?: string;
  route_type?: number;
  route_color?: string;
  route_text_color?: string;
  [key: string]: unknown;
}

/**
 * GET /trips/?route_id= item (TripViewSet, TripSerializer fields="__all__").
 *
 * A GTFS trip intrinsically carries route_id, direction_id AND shape_id — the
 * same bundle the simulator schedules per run (databus-sim
 * scheduler.py `CreateRunRequest`). The operator picks ONE trip and the run's
 * direction + shape come along with it; there is no separate "direction" step.
 * This also avoids the which-shapes/service-today/find-trips discovery
 * endpoints, which depend on backend tables that the GTFS loader leaves empty.
 */
export interface Trip {
  url?: string;
  feed?: string;
  route_id: string;
  service_id: string;
  trip_id: string;
  trip_headsign: string;
  trip_short_name?: string;
  direction_id: number;
  block_id?: string;
  shape_id: string;
  [key: string]: unknown;
}

/**
 * GET /vehicle/ list item. VehicleSerializer is a HyperlinkedModelSerializer,
 * so the wire payload carries `url` (…/vehicle/<id>/) but NOT an `id` field.
 * `id` is the vehicle's string PK — the vehicle_id used in create-run and the
 * MQTT topic — which getVehicles() backfills from the url tail (see
 * services/schedule.ts).
 */
export interface Vehicle {
  url?: string;
  id: string;
  company?: number | null;
  label?: string | null;
  license_plate: string;
  wheelchair_accessible?: string | null;
  wifi?: string | null;
  air_conditioning?: string | null;
  mobile_charging?: string | null;
  bike_rack?: string | null;
  has_screen?: boolean;
  has_headsign_screen?: boolean;
  has_audio?: boolean;
  status?: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Run lifecycle
// ---------------------------------------------------------------------------

/** GTFS-RT schedule_relationship, per CreateRunSerializer.schedule_relationship. */
export type ScheduleRelationship =
  | 'SCHEDULED'
  | 'ADDED'
  | 'UNSCHEDULED'
  | 'CANCELED'
  | 'DUPLICATED'
  | 'DELETED';

/** POST /create-run/ request body (CreateRunSerializer). */
export interface CreateRunInput {
  vehicle_id: string;
  operator_id: string;
  route_id: string;
  trip_id: string;
  direction_id: number;
  shape_id: string;
  schedule_relationship: ScheduleRelationship;
}

/** POST /create-run/ 200 response (CreateRunViewSet). */
export interface CreateRunResponse {
  status: 'success';
  run_id: string;
  run_lifecycle_state: string; // "Initialized" for a fresh run
}

/**
 * Events the app is allowed to send to /runs/<id>/update/. The server also
 * accepts realtime_engine-only events, but the app must never send those
 * (verified against RunLifecycleEvents in
 * ../databus/backend/runs/domain/lifecycle/events.py).
 */
export type RunUpdateEvent =
  | 'run_confirmed_by_operator'
  | 'cancel_run'
  | 'run_completed'
  | 'run_interrupted'
  | 'run_short_turned';

/** POST /runs/<run_id>/update/ request body (RunUpdateSerializer). */
export interface RunUpdateRequest {
  event: RunUpdateEvent;
  details?: Record<string, unknown>;
}

/** POST /runs/<run_id>/update/ 200 response. */
export interface RunUpdateResponse {
  status: 'success';
  run_lifecycle_state: string;
}

/** GET /runs/<run_id>/state/ 200 response (RunStateViewSet). */
export interface RunStateResponse {
  status: 'success';
  run_lifecycle_state: string;
}

/** GET /runs/<run_id>/history/ transition entry (RunHistoryView). */
export interface RunHistoryTransition {
  event: string;
  from_state: string;
  to_state: string;
  timestamp: string; // ISO-8601
  actions: Record<string, unknown>;
  guards: Record<string, unknown>;
}

/** GET /runs/<run_id>/history/ 200 response. */
export interface RunHistoryResponse {
  run_id: string;
  transitions: RunHistoryTransition[];
}

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

/**
 * The custom run endpoints (create-run, runs/<id>/update, runs/<id>/state,
 * runs/<id>/history) return this shape on error (400/404/422/500) — verified
 * in views.py. `step` is only present on /create-run/ failures.
 */
export interface ApiErrorEnvelope {
  status: 'error';
  step?: string;
  errors: unknown;
}

/**
 * LoginView and FindTripsView (missing query params) return a simpler
 * `{error: string}` shape instead of the standard envelope above — verified
 * in views.py. apiClient normalizes both into ApiError.
 */
export interface ApiLegacyErrorBody {
  error: string;
}
