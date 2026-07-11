import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { apiGet, apiPost, ApiError } from '@/services/apiClient';
import { useAuthStore } from '@/stores/auth';

function jsonResponse(body: unknown, status = 200, ok = status >= 200 && status < 300) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('apiClient', () => {
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

  it('performs a GET with query params against the configured base URL', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse([{ service_id: 'WEEKDAY' }]));

    const result = await apiGet<Array<{ service_id: string }>>('/service-today/', {
      date: '2026-07-10',
    });

    expect(result).toEqual([{ service_id: 'WEEKDAY' }]);
    const [calledUrl] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('http://localhost:8000/api/service-today/?date=2026-07-10');
  });

  it('injects the Authorization header from the auth store when a session exists', async () => {
    useAuthStore().session = {
      token: 'abc123',
      operatorId: 'op-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
    };
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'success', run_lifecycle_state: 'Confirmed' }));

    await apiPost('/runs/r1/update/', { event: 'run_confirmed_by_operator' });

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe('Token abc123');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('normalizes the standard {status:"error", step, errors} envelope into ApiError', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { status: 'error', step: 'gtfs_validation', errors: { route_id: 'invalid' } },
        422,
        false
      )
    );

    await expect(apiPost('/create-run/', {})).rejects.toMatchObject({
      status: 422,
      step: 'gtfs_validation',
      errors: { route_id: 'invalid' },
    });
  });

  it('normalizes the legacy {error: string} shape (login / find-trips) into ApiError', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: 'Usuario o contraseña incorrectos' }, 400, false)
    );

    let caught: unknown;
    try {
      await apiPost('/login/', { username: 'x', password: 'y' });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(400);
    expect((caught as ApiError).errors).toEqual({ detail: 'Usuario o contraseña incorrectos' });
    expect((caught as ApiError).step).toBeUndefined();
  });

  it('falls back to a synthetic error body when the response is not JSON', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('not json');
      },
      text: async () => '',
    } as unknown as Response);

    await expect(apiGet('/routes/')).rejects.toMatchObject({
      status: 500,
      errors: { detail: 'Internal Server Error' },
    });
  });

  it('wraps network failures in ApiError with status 0', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(apiGet('/routes/')).rejects.toMatchObject({ status: 0 });
  });

  it('throws when VITE_API_BASE_URL is not configured', async () => {
    // Force empty (unstubAllEnvs would restore a local .env value, hiding this).
    vi.stubEnv('VITE_API_BASE_URL', '');
    await expect(apiGet('/routes/')).rejects.toThrow('VITE_API_BASE_URL');
  });
});
