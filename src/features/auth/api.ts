export interface SessionUser {
  name: string;
  role: string;
  permissions: { manage_accounts: boolean };
}

export interface Area {
  id: number;
  name: string;
}

export interface Account {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  all_areas: boolean;
  areas: Area[];
  delivery_status: string;
}

export interface RecoveryRequest {
  id: number;
  name: string;
  email: string;
  requested_at: string;
}

export interface ActivationDetails {
  first_names: string;
  last_names: string;
  email: string;
  all_areas: boolean;
  areas: Area[];
  role: string;
}

interface AuthPayload {
  access?: string;
  user: SessionUser;
}

interface CsrfPayload {
  csrf_token: string;
}

export class ApiError extends Error {
  status?: number;
  payload?: Record<string, unknown>;
}

export function errorText(failure: unknown): string {
  return failure instanceof Error
    ? failure.message
    : "No se pudo completar la solicitud";
}

const apiBase = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

let accessToken: string | null = null;
let renewal: Promise<SessionUser> | null = null;
let csrfToken = "";

function csrfCookie(): string {
  if (csrfToken) return csrfToken;
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    const record = payload as Record<string, unknown>;
    const detail =
      record.detail ??
      Object.values(record)[0] ??
      "No se pudo completar la solicitud";
    const failure = new ApiError(
      Array.isArray(detail) ? detail.map(String).join(" ") : String(detail),
    );
    failure.status = response.status;
    failure.payload = record;
    throw failure;
  }
  return payload;
}

export async function prepareCsrf(): Promise<void> {
  const payload = await parseResponse<CsrfPayload>(
    await fetch(`${apiBase}/api/auth/csrf/`, { credentials: "include" }),
  );
  csrfToken = payload.csrf_token;
}

async function rawRequest(
  path: string,
  options: RequestInit = {},
  namespace: "auth" | "projects" = "auth",
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${apiBase}/api/${namespace}/${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
}

export async function refreshSession(): Promise<SessionUser> {
  if (!renewal) {
    renewal = (async () => {
      await prepareCsrf();
      const response = await rawRequest("refresh/", {
        method: "POST",
        headers: { "X-CSRFToken": csrfCookie() },
      });
      const payload = await parseResponse<AuthPayload>(response);
      accessToken = payload.access ?? null;
      return payload.user;
    })().finally(() => {
      renewal = null;
    });
  }
  return renewal;
}

export async function login(
  email: string,
  password: string,
): Promise<SessionUser> {
  await prepareCsrf();
  const response = await rawRequest("login/", {
    method: "POST",
    headers: { "X-CSRFToken": csrfCookie() },
    body: JSON.stringify({ email, password }),
  });
  const payload = await parseResponse<AuthPayload>(response);
  accessToken = payload.access ?? null;
  return payload.user;
}

export async function logout(): Promise<void> {
  await prepareCsrf();
  await parseResponse<unknown>(
    await rawRequest("logout/", {
      method: "POST",
      headers: { "X-CSRFToken": csrfCookie() },
    }),
  );
  accessToken = null;
}

export function clearAccess(): void {
  accessToken = null;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
  namespace: "auth" | "projects" = "auth",
): Promise<T> {
  let response = await rawRequest(path, options, namespace);
  if (response.status === 401 && retry) {
    try {
      await refreshSession();
      response = await rawRequest(path, options, namespace);
    } catch {
      accessToken = null;
      window.dispatchEvent(new Event("gm-session-expired"));
    }
  }
  return parseResponse<T>(response);
}
