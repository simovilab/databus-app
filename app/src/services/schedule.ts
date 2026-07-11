// GTFS schedule lookups used by the trip-setup flow.
// Verified against ../databus/backend/api/{urls,views,serializers}.py.

import { apiGet } from '@/services/apiClient';
import type {
  Route,
  RunHistoryResponse,
  RunStateResponse,
  Trip,
  Vehicle,
} from '@/types/api';

/** GET /routes/ — all GTFS routes for the current feed. */
export function getRoutes(): Promise<Route[]> {
  return apiGet<Route[]>('/routes/');
}

/**
 * GET /trips/?route_id= — every trip on a route. Each trip already carries its
 * direction_id and shape_id (a GTFS trip is a route+direction+shape+time
 * bundle), so the operator selects a trip and the run's direction/shape come
 * with it. This mirrors the simulator, whose schedule entries bundle
 * trip_id + direction_id + shape_id per run (databus-sim scheduler.py), and
 * deliberately avoids the which-shapes / service-today / find-trips endpoints,
 * which read backend tables the GTFS loader leaves empty (RouteStop, TripTime,
 * CalendarDate).
 */
export function getTrips(routeId: string): Promise<Trip[]> {
  return apiGet<Trip[]>('/trips/', { route_id: routeId });
}

/**
 * GET /vehicle/?company= — vehicles available for run creation (R3).
 *
 * The backend VehicleSerializer is a HyperlinkedModelSerializer: it emits
 * `url` (…/vehicle/<id>/) but no `id` field, even though `id` IS the vehicle's
 * PK (the vehicle_id create-run needs). Backfill `id` from the url tail when
 * the server omits it, so callers always get a usable vehicle_id.
 */
export async function getVehicles(company?: string): Promise<Vehicle[]> {
  const params = company ? { company } : undefined;
  const vehicles = await apiGet<Vehicle[]>('/vehicle/', params);
  return vehicles.map((v) =>
    v.id ? v : { ...v, id: vehicleIdFromUrl(v.url) },
  );
}

/** Extract the trailing PK segment from a hyperlinked vehicle URL. */
function vehicleIdFromUrl(url: string | undefined): string {
  if (!url) return '';
  // ".../api/vehicle/unit-01/?format=json" or ".../api/vehicle/unit-01/"
  const path = url.split('?')[0].replace(/\/+$/, '');
  return path.substring(path.lastIndexOf('/') + 1);
}

/**
 * GET /runs/<id>/state/ — the run's current lifecycle state. Returns 404
 * (thrown as ApiError with status 404) when the run does not exist; the
 * run-history store uses that to prune stale local entries.
 */
export function getRunState(runId: string): Promise<RunStateResponse> {
  return apiGet<RunStateResponse>(`/runs/${runId}/state/`);
}

/**
 * GET /runs/<id>/history/ — the ordered FSM transition timeline for a run
 * (RunHistoryView). Used by the run-details modal; this is the only per-run
 * read the backend exposes (there is no run-list endpoint).
 */
export function getRunHistory(runId: string): Promise<RunHistoryResponse> {
  return apiGet<RunHistoryResponse>(`/runs/${runId}/history/`);
}
