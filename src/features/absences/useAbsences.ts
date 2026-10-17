import { useCallback, useEffect, useRef, useState } from "react";
import {
  listAbsences,
  reviewAbsence,
} from "../../core/services/absenceService";
import type {
  Absence,
  AbsenceFilters,
} from "../../core/interfaces/absence.interface";

export const useAbsences = (filters?: AbsenceFilters) => {
  const [data, setData] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listAbsences(filtersRef.current);
      setData(response);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(fetch);
  }, [fetch, filters?.search, filters?.status]);

  const review = useCallback(async (id: number, aprobada: boolean) => {
    const updated = await reviewAbsence(id, { aprobada });
    setData((current) =>
      current.map((absence) => (absence.id === id ? updated : absence)),
    );
    return updated;
  }, []);

  return { data, loading, error, refetch: fetch, review };
};
