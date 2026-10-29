import { useRef, useState } from "react";
import { addMySpecialty, listMySpecialties, listMySpecialtyOptions, removeMySpecialty } from "../../../core/services/workerService";
import { useRemoteResource } from "../../../hooks/useRemoteResource";

export const useProfile = () => {
  const mine = useRemoteResource(listMySpecialties, "profile-specialties");
  const options = useRemoteResource(listMySpecialtyOptions, "profile-specialty-options");
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  async function mutate(write: () => Promise<unknown>) {
    if (pending.current) throw new Error("Espera a que termine el guardado.");
    if (!mine.isCurrent() || !mine.ready || mine.pending || mine.error) throw new Error("Actualiza tus especialidades antes de editar.");
    pending.current = true; setSaving(true);
    try {
      await write();
      if (mine.isCurrent()) await mine.refetch();
    } finally {
      pending.current = false;
      if (mine.isCurrent()) setSaving(false);
    }
  }
  const specialties = mine.value ?? [];
  return {
    mine, options, specialties,
    catalog: (options.value ?? []).filter((item) => !specialties.some((own) => own.id === item.id)),
    saving,
    addSpecialty: (id: number) => mutate(() => addMySpecialty({ specialty_id: id })),
    dropSpecialty: (id: number) => mutate(() => removeMySpecialty(id)),
  };
};
