export interface Absence {
  id: number;
  trabajador_id: number;
  trabajador_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  anulada: boolean;
  aprobada: boolean | null;
}

export type AbsenceStatus = "pendiente" | "aprobada" | "anulada";

export function absenceStatus(absence: Absence): AbsenceStatus {
  if (absence.anulada) return "anulada";
  if (absence.aprobada) return "aprobada";
  return "pendiente";
}

export interface AbsenceFilters {
  status?: AbsenceStatus;
  search?: string;
}

export interface AbsenceReviewData {
  aprobada: boolean;
}

export interface AbsenceCreateData {
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
}
