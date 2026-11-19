/**
 * API client for the DAKSH Phase 3 backend (NestJS, /api/v1).
 *
 * - Base URL comes from NEXT_PUBLIC_API_URL (see .env.example).
 * - The only credential the dashboard ever holds is the admin JWT,
 *   returned by POST /admin/auth/login and kept in localStorage.
 * - NestJS error bodies look like { statusCode, message, error } where
 *   `message` is a string or an array of strings (validation errors).
 * - Any 401 clears the session and sends the browser to /login.
 */

import type { AdminSession } from "./types";

export const API_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

const TOKEN_KEY = "daksh_admin_token";
const ADMIN_KEY = "daksh_admin";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getAdmin(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function saveSession(token: string, admin: AdminSession): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_KEY);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Set false for the login call itself (no token to attach yet). */
  auth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      `Cannot reach the backend at ${API_URL}. Is the DAKSH backend (Phase 3) running?`,
    );
  }

  if (res.status === 401 && auth) {
    clearSession();
    if (
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status}).`;
    if (data && typeof data === "object" && "message" in data) {
      const m = (data as { message: unknown }).message;
      if (typeof m === "string" && m.trim()) message = m;
      else if (Array.isArray(m) && m.length) message = m.join(", ");
    }
    throw new ApiError(res.status, message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
