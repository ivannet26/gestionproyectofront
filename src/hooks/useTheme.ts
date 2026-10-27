import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEYS = ["gm-theme", "theme"];

function resolve(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", resolve(theme) === "dark");
}

export function getStoredTheme(): Theme {
  for (const key of STORAGE_KEYS) {
    const value = localStorage.getItem(key);
    if (value === "light" || value === "dark" || value === "system") return value;
  }
  return "light";
}

export function applyInitialTheme() {
  apply(getStoredTheme());
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());

  // Keep state in sync if another tab changes the theme.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || STORAGE_KEYS.includes(event.key ?? ""))
        setThemeState(getStoredTheme());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    apply(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => apply("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    for (const key of STORAGE_KEYS) localStorage.setItem(key, next);
    setThemeState(next);
  }, []);

  return { theme, setTheme, resolved: resolve(theme) };
}
