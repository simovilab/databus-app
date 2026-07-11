// GTFS schedule lookups used by the trip-setup flow.
// Verified against ../databus/backend/api/{urls,views,serializers}.py.

import { apiGet } from '@/services/apiClient';
import type { Route, Trip, Vehicle } from '@/types/api';

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

/** GET /vehicle/?company= — vehicles available for run creation (R3). */
export function getVehicles(company?: string): Promise<Vehicle[]> {
  const params = company ? { company } : undefined;
  return apiGet<Vehicle[]>('/vehicle/', params);
}
