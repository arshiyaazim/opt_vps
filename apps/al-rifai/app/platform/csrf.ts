'use client';

/**
 * Minimal CSRF-aware writer for the RBAC-2B client surfaces.
 *
 * The session cookie is HttpOnly, so the browser cannot read it — the token comes from
 * GET /api/auth/session and is sent back in X-CSRF-Token, exactly as the Cash Portal
 * does. A 403 clears the cache so the next attempt fetches a fresh token instead of
 * retrying a stale one.
 */
let cached: { csrf: string; at: number } | null = null;

export async function csrfToken(force = false): Promise<string> {
  if (!force && cached && Date.now() - cached.at < 5 * 60_000) return cached.csrf;
  const response = await fetch('/api/auth/session', {cache: 'no-store'});
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data?.csrf !== 'string') throw new Error(data?.error || 'AUTHENTICATION_REQUIRED');
  cached = {csrf: data.csrf, at: Date.now()};
  return data.csrf;
}

export async function writeJson<T = Record<string, unknown>>(url: string, body: unknown): Promise<T> {
  const token = await csrfToken();
  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-CSRF-Token': token},
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403) cached = null;
    throw new Error(data?.error || 'REQUEST_FAILED');
  }
  return data as T;
}
