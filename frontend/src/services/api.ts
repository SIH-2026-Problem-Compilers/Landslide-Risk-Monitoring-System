/**
 * Shared API client for all backend calls.
 *
 * - Reads VITE_LHASA_API_URL (empty = use Vite proxy → localhost:8000)
 * - Reads VITE_API_TIMEOUT_MS (default 4000 ms)
 * - On any error falls back gracefully — callers decide what to do with null
 */

const API_BASE = (
  (import.meta.env.VITE_LHASA_API_URL as string | undefined) ?? ''
).replace(/\/+$/, '');

const TIMEOUT_MS = Number(
  (import.meta.env.VITE_API_TIMEOUT_MS as string | undefined) ?? '4000'
);

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
    if (!res.ok) throw new Error(`API ${res.status} ${res.statusText} for ${path}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Wraps apiFetch with a mock fallback so every service degrades gracefully. */
export async function withFallback<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  label?: string,
): Promise<T> {
  try {
    return await fetcher();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[api] falling back to mock data${label ? ` (${label})` : ''}:`, err);
    }
    return fallback;
  }
}
