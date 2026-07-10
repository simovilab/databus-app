// Typed fetch wrapper for the Databús orchestrator REST API.
// Base URL: import.meta.env.VITE_API_BASE_URL. Injects `Authorization: Token
// <token>` from the auth store when a session exists. Normalizes both error
// envelope shapes returned by the backend (verified in
// ../databus/backend/api/views.py):
//   - {status:"error", step?, errors}   (create-run / runs/<id>/update|state|history)
//   - {error: "..."}                    (login, find-trips missing-params)
// into a single thrown ApiError.

import { useAuthStore } from '@/stores/auth';
import type { ApiErrorEnvelope, ApiLegacyErrorBody } from '@/types/api';

export class ApiError extends Error {
  status: number;
  errors?: unknown;
  step?: string;

  constructor(status: number, errors?: unknown, step?: string, message?: string) {
    super(message ?? `API request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.step = step;
  }
}

function getBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!baseUrl) {
    throw new Error(
      'VITE_API_BASE_URL is not configured (set it in app/.env, see .env.example)'
    );
  }
  return baseUrl.replace(/\/+$/, '');
}

function buildUrl(path: string, params?: Record<string, string>): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${getBaseUrl()}${normalizedPath}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }
  }
  return url.toString();
}

/** Reads the current session token, if any. Never throws — callers may run
 * before Pinia is installed (e.g. isolated unit tests). */
function readAuthToken(): string | undefined {
  try {
    return useAuthStore().session?.token;
  } catch {
    return undefined;
  }
}

function buildHeaders(hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  const token = readAuthToken();
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  return headers;
}

async function parseErrorBody(
  response: Response
): Promise<{ errors: unknown; step?: string }> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { errors: { detail: response.statusText || 'Unknown error' } };
  }

  if (body && typeof body === 'object') {
    const envelope = body as Partial<ApiErrorEnvelope>;
    if (envelope.status === 'error') {
      return { errors: envelope.errors, step: envelope.step };
    }
    const legacy = body as Partial<ApiLegacyErrorBody>;
    if (typeof legacy.error === 'string') {
      return { errors: { detail: legacy.error } };
    }
  }
  return { errors: body };
}

async function request<T>(
  path: string,
  init: RequestInit,
  params?: Record<string, string>
): Promise<T> {
  const url = buildUrl(path, params);
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiError(0, { detail: 'Network request failed' }, undefined, 'Network request failed');
  }

  if (!response.ok) {
    const { errors, step } = await parseErrorBody(response);
    throw new ApiError(response.status, errors, step);
  }

  const text = await response.text();
  return (text.length ? JSON.parse(text) : undefined) as T;
}

export function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  return request<T>(path, { method: 'GET', headers: buildHeaders(false) }, params);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });
}
