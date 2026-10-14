import axios from "axios";
import { getAccessToken, refreshSession } from "../../features/auth/api";

const baseURL = "http://localhost:8000/api";

export const httpClient = axios.create({
  baseURL,
});

httpClient.interceptors.request.use(async (config) => {
  let token = getAccessToken();

  if (!token) {
    await refreshSession();
    token = getAccessToken();
  }

  if (!token) {
    throw new Error("No se pudo obtener un token de sesión válido.");
  }

  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
