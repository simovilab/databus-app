import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  findTrips,
  getRoutes,
  getServiceToday,
  getVehicles,
  getWhichShapes,
} from '@/services/schedule';

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

  it('getServiceToday() maps the response to a list of service_ids', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ service_id: 'WEEKDAY' }, { service_id: 'SATURDAY' }])
    );

    const services = await getServiceToday('2026-07-10');

    expect(services).toEqual(['WEEKDAY', 'SATURDAY']);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/service-today/?date=2026-07-10'
    );
  });

  it('getServiceToday() omits the date param when not provided', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await getServiceToday();

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/service-today/');
  });

  it('getWhichShapes() GETs /which-shapes/?route_id=', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          shape_id: 's1',
          direction_id: 0,
          shape_name: 'Norte',
          shape_desc: '',
          shape_from: 'A',
          shape_to: 'B',
        },
      ])
    );

    const shapes = await getWhichShapes('R1');

    expect(shapes[0].shape_id).toBe('s1');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/which-shapes/?route_id=R1'
    );
  });

  it('findTrips() GETs /find-trips/ with all three required params', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await findTrips({ routeId: 'R1', serviceId: 'WEEKDAY', shapeId: 'S1' });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/api/find-trips/');
    expect(url.searchParams.get('route_id')).toBe('R1');
    expect(url.searchParams.get('service_id')).toBe('WEEKDAY');
    expect(url.searchParams.get('shape_id')).toBe('S1');
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
