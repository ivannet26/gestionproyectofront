import { useEffect, useState } from "react";
import { listSpecialties } from "../../../core/services/organizationService";
import type { Specialty } from "../../../core/interfaces/organization.interface";

export const useSpecialties = () => {
  const [data, setData] = useState<Specialty[]>([]);

  const fetch = async () => {
    try {
      const response = await listSpecialties();
      setData(response);
    } catch {
      // los componentes tsx no usan loading/error: se mantiene la lista vacía
    }
  };

  useEffect(() => {
    Promise.resolve().then(fetch);
  }, []);

  return { data, refetch: fetch };
};
