import { useState } from "react";
import TeamsIcon from "../../shared/icons/TeamsIcon";
import EditIcon from "../../shared/icons/EditIcon";
import TrashIcon from "../../shared/icons/TrashIcon";
import PlusIcon from "../../shared/icons/PlusIcon";
import { useAreas } from "./useAreas";
import { useTeams } from "./useTeams";
import TeamForm from "./TeamForm/TeamForm";
import type { TeamFormState } from "./TeamForm/useTeamForm";
import {
  createTeam,
  removeTeam,
  updateTeam,
} from "../../core/services/organizationService";
import type {
  Team,
  TeamWriteData,
} from "../../core/interfaces/organization.interface";

type TeamModal = { mode: "create" } | { mode: "edit"; team: Team };

const emptyTeam: TeamFormState = { area: "", name: "", active: true };

function TeamsSection() {
  const { data, error, loading, refetch } = useTeams();
  const { data: areas } = useAreas();
  const [modal, setModal] = useState<TeamModal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData: TeamWriteData) => {
    if (modal == null) return;
    setSubmitting(true);
    try {
      if (modal.mode === "edit") {
        await updateTeam(modal.team.id, formData);
      } else {
        await createTeam(formData);
      }
      refetch();
      setModal(null);
    } catch (e) {
      console.error("Error saving team:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (team: Team) => {
    if (!window.confirm(`¿Eliminar el equipo ${team.name}?`)) return;
    try {
      await removeTeam(team.id);
      refetch();
    } catch (e) {
      console.error("Error deleting team:", e);
    }
  };

  return (
    <section aria-label="Equipos">
      <div className="flex items-center justify-between gap-3 px-5 mb-3">
        <h3 className="m-0 text-sm font-semibold text-neutral-900">Equipos</h3>
        <button
          type="button"
          className="grid place-items-center w-8 h-8 text-neutral-900 bg-white border border-neutral-200 cursor-pointer shadow-none"
          onClick={() => setModal({ mode: "create" })}
          aria-label="Nuevo equipo"
        >
          <PlusIcon />
        </button>
      </div>
      {error && (
        <p className="mx-5 border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-none" role="alert">
          {error.message}
        </p>
      )}
      {loading ? (
        <p role="status" className="px-5 text-sm text-neutral-600">Cargando equipos…</p>
      ) : data.length === 0 && !error ? (
        <p role="status" className="px-5 text-sm text-neutral-600">No hay equipos registrados.</p>
      ) : (
        <ul className="m-0 px-5 list-none">
          {data.map((team) => (
            <li key={team.id} className="flex items-center gap-3 py-3 border-b border-neutral-200 last:border-b-0">
              <span className="grid place-items-center w-8 h-8 flex-none text-neutral-600" aria-hidden="true">
                <TeamsIcon />
              </span>
              <span className="flex-1 min-w-0 text-sm text-neutral-900">
                {team.name}
                <span className="mx-1 text-neutral-600" aria-hidden="true">
                  ·
                </span>
                {team.area_name}
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  className="grid place-items-center w-8 h-8 text-neutral-600 bg-white border border-neutral-200 cursor-pointer shadow-none"
                  onClick={() => setModal({ mode: "edit", team })}
                  aria-label={`Editar ${team.name}`}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="grid place-items-center w-8 h-8 text-neutral-600 bg-white border border-neutral-200 cursor-pointer shadow-none"
                  onClick={() => handleDelete(team)}
                  aria-label={`Eliminar ${team.name}`}
                >
                  <TrashIcon />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {modal != null && (
        <TeamForm
          key={modal.mode === "edit" ? modal.team.id : "new"}
          title={modal.mode === "edit" ? "Editar equipo" : "Nuevo equipo"}
          submitLabel={modal.mode === "edit" ? "Guardar cambios" : "Crear"}
          initialData={
            modal.mode === "edit"
              ? {
                  area: String(modal.team.area),
                  name: modal.team.name,
                  active: modal.team.active,
                }
              : emptyTeam
          }
          areas={areas}
          submitting={submitting}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}

export default TeamsSection;
