// GTFS schedule lookups used by the trip-setup flow.
// Verified against ../databus/backend/api/{urls,views,serializers}.py.

import { apiGet } from '@/services/apiClient';
import type {
  FindTripsQuery,
  Route,
  ShapeChoice,
  TripChoice,
  Vehicle,
} from '@/types/api';

/** GET /routes/ — all GTFS routes for the current feed. */
export function getRoutes(): Promise<Route[]> {
  return apiGet<Route[]>('/routes/');
}

/**
 * GET /service-today/?date=YYYY-MM-DD — service_ids active on the given date
 * (defaults server-side to today when omitted).
 */
export async function getServiceToday(date?: string): Promise<string[]> {
  const params = date ? { date } : undefined;
  const services = await apiGet<Array<{ service_id: string }>>(
    '/service-today/',
    params
  );
  return services.map((s) => s.service_id);
}

/** GET /which-shapes/?route_id= — direction/shape choices for a route. */
export function getWhichShapes(routeId: string): Promise<ShapeChoice[]> {
  return apiGet<ShapeChoice[]>('/which-shapes/', { route_id: routeId });
}

/** GET /find-trips/?route_id=&service_id=&shape_id= — trips to pick by time. */
export function findTrips(query: FindTripsQuery): Promise<TripChoice[]> {
  return apiGet<TripChoice[]>('/find-trips/', {
    route_id: query.routeId,
    service_id: query.serviceId,
    shape_id: query.shapeId,
  });
}

/** GET /vehicle/?company= — vehicles available for run creation (R3). */
export function getVehicles(company?: string): Promise<Vehicle[]> {
  const params = company ? { company } : undefined;
  return apiGet<Vehicle[]>('/vehicle/', params);
}
