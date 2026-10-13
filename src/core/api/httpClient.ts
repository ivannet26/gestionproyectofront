import { refreshSession } from "../../features/auth/api";
import axios from "axios";

const baseURL = "http://localhost:8000/api";

export const httpClient = axios.create({
  baseURL,
});

httpClient.interceptors.request.use(async (config) => {
  const token = localStorage.getItem("token");
  if (!token) {
    await refreshSession();
  }
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
