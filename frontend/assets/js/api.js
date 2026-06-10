import { getAccessToken, getRefreshToken, storeAccessToken, persistTokens } from './session-token.js';

const API_BASE = '/api/v1';

function buildHeaders(extra = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extra,
  };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseResponse(res) {
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = data?.error ?? {};
    throw new ApiError(
      res.status,
      error.code || 'REQUEST_FAILED',
      error.message || 'Request failed'
    );
  }
  return data;
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: buildHeaders(options.headers),
    ...options,
  });

  if (
    res.status === 401 &&
    path !== '/auth/login' &&
    path !== '/auth/refresh' &&
    path !== '/auth/telegram-miniapp'
  ) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const retry = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        headers: buildHeaders(options.headers),
        ...options,
      });
      return parseResponse(retry);
    }
  }

  return parseResponse(res);
}

let refreshPromise = null;

async function tryRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: buildHeaders(),
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json().catch(() => null);
        if (data?.accessToken) {
          persistTokens({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || refreshToken,
          });
        }
        return Boolean(data?.accessToken);
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}
