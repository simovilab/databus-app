import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { getRoutes, getTrips, getVehicles } from '@/services/schedule';

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('schedule service', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/api');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('getRoutes() GETs /routes/', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 1, route_id: 'R1' }]));

    const routes = await getRoutes();

    expect(routes).toEqual([{ id: 1, route_id: 'R1' }]);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/routes/');
  });

  it('getTrips() GETs /trips/?route_id= and returns trips carrying direction+shape', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          trip_id: 'hacia_artes_entresemana_08:35',
          route_id: 'R1',
          service_id: 'entresemana',
          trip_headsign: 'Artes',
          direction_id: 0,
          shape_id: 'hacia_artes',
        },
      ])
    );

    const trips = await getTrips('R1');

    expect(trips[0].direction_id).toBe(0);
    expect(trips[0].shape_id).toBe('hacia_artes');
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/api/trips/');
    expect(url.searchParams.get('route_id')).toBe('R1');
  });

  it('getVehicles() GETs /vehicle/ with an optional company filter', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 'veh-1', license_plate: 'ABC123' }]));

    await getVehicles('co-1');

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/vehicle/?company=co-1');
  });

  it('getVehicles() omits the company filter when not provided', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await getVehicles();

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/vehicle/');
  });
});
