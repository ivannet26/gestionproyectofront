export interface SessionUser {
  id: number;
  name: string;
  role: string;
  areas: Area[];
  all_areas: boolean;
  permissions: { manage_accounts: boolean };
}

export interface SessionProfile {
  id: number;
  name: string;
  email: string;
  role: string;
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
let sessionEpoch = 0;
let principal = "";

const pendingReads = new Map<string, Promise<unknown>>();

export function sessionKey(user: SessionUser): string {
  return JSON.stringify([
    user.id,
    user.role,
    user.all_areas,
    user.areas.map((area) => area.id).sort((a, b) => a - b),
    user.permissions,
  ]);
}

function checkSession(epoch: number): void {
  if (epoch !== sessionEpoch) {
    throw new Error("La sesión cambió. Vuelve a cargar la información.");
  }
}

function csrfCookie(): string {
  if (csrfToken) {
    return csrfToken;
  }

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

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${apiBase}/api/${namespace}/${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
}

export async function refreshSession(): Promise<SessionUser> {
  if (!renewal) {
    const epoch = sessionEpoch;

    const operation = (async () => {
      await prepareCsrf();
      checkSession(epoch);

      const response = await rawRequest("refresh/", {
        method: "POST",
        headers: { "X-CSRFToken": csrfCookie() },
      });

      const payload = await parseResponse<AuthPayload>(response);
      checkSession(epoch);

      const nextPrincipal = sessionKey(payload.user);

      if (principal && principal !== nextPrincipal) {
        sessionEpoch += 1;
        pendingReads.clear();
      }

      principal = nextPrincipal;
      accessToken = payload.access ?? null;

      window.dispatchEvent(
        new CustomEvent("gm-session-updated", {
          detail: payload.user,
        }),
      );

      return payload.user;
    })().finally(() => {
      if (renewal === operation) {
        renewal = null;
      }
    });

    renewal = operation;
  }

  return renewal;
}

export async function login(
  email: string,
  password: string,
): Promise<SessionUser> {
  clearAccess();
  const epoch = sessionEpoch;

  await prepareCsrf();
  checkSession(epoch);

  const response = await rawRequest("login/", {
    method: "POST",
    headers: { "X-CSRFToken": csrfCookie() },
    body: JSON.stringify({ email, password }),
  });

  const payload = await parseResponse<AuthPayload>(response);
  checkSession(epoch);

  accessToken = payload.access ?? null;
  principal = sessionKey(payload.user);

  return payload.user;
}

export async function logout(): Promise<void> {
  const epoch = sessionEpoch;

  await prepareCsrf();

  await parseResponse<unknown>(
    await rawRequest("logout/", {
      method: "POST",
      headers: { "X-CSRFToken": csrfCookie() },
    }),
  );

  if (epoch === sessionEpoch) {
    clearAccess();
  }
}

export function clearAccess(): void {
  accessToken = null;
  principal = "";
  sessionEpoch += 1;
  pendingReads.clear();
  renewal = null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function executeRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
  namespace: "auth" | "projects" = "auth",
): Promise<T> {
  const epoch = sessionEpoch;
  const sentToken = accessToken;

  let response = await rawRequest(path, options, namespace);
  checkSession(epoch);

  if (response.status === 401 && retry) {
    try {
      if (!accessToken || accessToken === sentToken) {
        await refreshSession();
      }

      checkSession(epoch);
      response = await rawRequest(path, options, namespace);
    } catch (failure) {
      if (epoch === sessionEpoch) {
        clearAccess();
        window.dispatchEvent(new Event("gm-session-expired"));
        throw failure;
      }

      checkSession(epoch);
      throw failure;
    }
  }

  checkSession(epoch);

  const payload = await parseResponse<T>(response);
  checkSession(epoch);

  if ((options.method ?? "GET").toUpperCase() !== "GET") {
    pendingReads.clear();
  }

  return payload;
}

export function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
  namespace: "auth" | "projects" = "auth",
): Promise<T> {
  if (Object.keys(options).length > 0) {
    return executeRequest<T>(path, options, retry, namespace);
  }

  const key = JSON.stringify([sessionEpoch, namespace, path, retry]);
  const existing = pendingReads.get(key);

  if (existing) {
    return existing as Promise<T>;
  }

  const operation = executeRequest<T>(path, options, retry, namespace).finally(
    () => {
      if (pendingReads.get(key) === operation) {
        pendingReads.delete(key);
      }
    },
  );

  pendingReads.set(key, operation);
  return operation;
}
