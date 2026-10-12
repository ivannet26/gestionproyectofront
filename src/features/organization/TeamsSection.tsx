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
import styles from "./OrganizationPage.module.css";

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
      <div className={styles["section-header"]}>
        <h3>Equipos</h3>
        <button
          type="button"
          className="icon-button"
          onClick={() => setModal({ mode: "create" })}
          aria-label="Nuevo equipo"
        >
          <PlusIcon />
        </button>
      </div>
      {error && (
        <p className="form-message form-message--error" role="alert">
          {error.message}
        </p>
      )}
      {loading ? (
        <p role="status">Cargando equipos…</p>
      ) : data.length === 0 && !error ? (
        <p role="status">No hay equipos registrados.</p>
      ) : (
        <ul className="record-list">
          {data.map((team) => (
            <li key={team.id} className="record">
              <span className="record-icon" aria-hidden="true">
                <TeamsIcon />
              </span>
              <span className="record-text">
                {team.name}
                <span className="record-sep" aria-hidden="true">
                  ·
                </span>
                {team.area_name}
              </span>
              <span className="record-actions">
                <button
                  type="button"
                  className="icon-button icon-button--edit"
                  onClick={() => setModal({ mode: "edit", team })}
                  aria-label={`Editar ${team.name}`}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button--danger"
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
