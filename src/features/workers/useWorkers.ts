import { useEffect, useState } from "react";
import { listWorkers } from "../../core/services/workerService";
import type { Worker } from "../../core/interfaces/worker.interface";

export const useWorkers = () => {
  const [data, setData] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = async () => {
    try {
      setLoading(true);
      const response = await listWorkers();
      setData(response);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(fetch);
  }, []);

  return { data, loading, error, refetch: fetch };
};
