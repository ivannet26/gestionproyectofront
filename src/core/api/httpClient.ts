import axios from "axios";
import type {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  ApiError,
  apiBase,
  checkSession,
  expireSession,
  getAccessToken,
  getCsrfToken,
  invalidateReads,
  refreshSession,
  sessionVersion,
  sharedRead,
} from "../../features/auth/api";

interface SessionConfig extends InternalAxiosRequestConfig {
  gmEpoch?: number;
  gmRetried?: boolean;
  gmAccess?: string | null;
}

export const httpClient = axios.create({
  baseURL: `${apiBase}/api/`,
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

async function renew(epoch: number): Promise<void> {
  try {
    await refreshSession();
    checkSession(epoch);
  } catch (failure) {
    expireSession(epoch);
    throw failure;
  }
}

function normalizeError(failure: unknown): unknown {
  if (
    failure instanceof ApiError ||
    !axios.isAxiosError(failure) ||
    axios.isCancel(failure)
  )
    return failure;
  const body = failure.response?.data;
  const payload =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : undefined;
  const detail =
    payload?.detail ??
    (payload && Object.values(payload)[0]) ??
    failure.message ??
    "No se pudo completar la solicitud";
  const error = new ApiError(
    Array.isArray(detail) ? detail.map(String).join(" ") : String(detail),
  );
  error.status = failure.response?.status;
  error.payload = payload;
  return error;
}

httpClient.interceptors.request.use(async (original) => {
  const config = original as SessionConfig;
  const epoch = config.gmEpoch ?? sessionVersion();
  config.gmEpoch = epoch;
  checkSession(epoch);
  if (!getAccessToken()) await renew(epoch);
  checkSession(epoch);
  const token = getAccessToken();
  if (!token) {
    expireSession(epoch);
    throw new ApiError("No se pudo obtener un token de sesión válido.");
  }
  config.gmAccess = token;
  config.headers.set("Authorization", `Bearer ${token}`);
  if (
    !["get", "head", "options"].includes(config.method ?? "get") &&
    getCsrfToken()
  )
    config.headers.set("X-CSRFToken", getCsrfToken());
  return config;
});

httpClient.interceptors.response.use(
  (response) => {
    const config = response.config as SessionConfig;
    checkSession(config.gmEpoch!);
    if (!["get", "head", "options"].includes(config.method ?? "get"))
      invalidateReads();
    return response;
  },
  async (failure: unknown) => {
    if (!axios.isAxiosError(failure) || !failure.config)
      throw normalizeError(failure);
    const config = failure.config as SessionConfig;
    const epoch = config.gmEpoch;
    if (epoch === undefined) throw normalizeError(failure);
    checkSession(epoch);
    if (failure.response?.status === 401) {
      if (config.gmRetried) {
        expireSession(epoch);
      } else {
        config.gmRetried = true;
        if (!getAccessToken() || getAccessToken() === config.gmAccess)
          await renew(epoch);
        checkSession(epoch);
        return httpClient.request(config);
      }
    }
    throw normalizeError(failure);
  },
);

const request: typeof httpClient.request = httpClient.request.bind(httpClient);
httpClient.request = function requestSession<
  T = unknown,
  R = AxiosResponse<T>,
  D = unknown,
  P = unknown,
>(config: AxiosRequestConfig<D, P>) {
  const scoped = {
    ...config,
    gmEpoch: (config as SessionConfig).gmEpoch ?? sessionVersion(),
  };
  return request<T, R, D, P>(scoped);
};

const get: typeof httpClient.get = httpClient.get.bind(httpClient);
httpClient.get = function getShared<
  T = unknown,
  R = AxiosResponse<T>,
  D = unknown,
  P = unknown,
>(url: string, config?: AxiosRequestConfig<D, P>) {
  const scoped = { ...config, gmEpoch: sessionVersion() };
  if (config && Object.keys(config).length) return get<T, R, D, P>(url, scoped);
  return sharedRead(`axios:${url}`, () => get<T, R, D, P>(url, scoped));
};
