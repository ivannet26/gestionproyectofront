import type { ProjectTaskState } from "./types";

export function stateCategory(code: string): string {
  if (code === "PENDIENTE") return "Sin iniciar";
  if (code === "COMPLETADA" || code === "CANCELADA") return "Cerradas";
  return "Activas";
}

export function groupTaskStates(states: ProjectTaskState[]) {
  return ["Sin iniciar", "Activas", "Cerradas"].map((label) => ({
    label, states: states.filter((state) => stateCategory(state.code) === label),
  })).filter((group) => group.states.length > 0);
}
