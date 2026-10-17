import { useEffect, useRef, useState } from "react";
import { errorText } from "../auth/api";
import { setProjectFavorite } from "./services";

export function useProjectFavorite(projectId: number, initialFavorite: boolean) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const saved = await setProjectFavorite(projectId, !favorite);
      if (mounted.current) setFavorite(saved.is_favorite);
    } catch (failure) {
      if (mounted.current) setError(errorText(failure));
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return { favorite, pending, error, toggle };
}
