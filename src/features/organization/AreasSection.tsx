import { useState } from "react";
import FolderIcon from "../../shared/icons/FolderIcon";
import EditIcon from "../../shared/icons/EditIcon";
import TrashIcon from "../../shared/icons/TrashIcon";
import PlusIcon from "../../shared/icons/PlusIcon";
import { useAreas } from "./useAreas";
import AreaForm from "./AreaForm/AreaForm";
import {
  createArea,
  removeArea,
  updateArea,
} from "../../core/services/organizationService";
import type {
  Area,
  AreaWriteData,
} from "../../core/interfaces/organization.interface";
import styles from "./OrganizationPage.module.css";

type AreaModal = { mode: "create" } | { mode: "edit"; area: Area };

const emptyArea: AreaWriteData = { code: "", name: "", active: true };

function AreasSection() {
  const { data, error, loading, refetch } = useAreas();
  const [modal, setModal] = useState<AreaModal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData: AreaWriteData) => {
    if (modal == null) return;
    setSubmitting(true);
    try {
      if (modal.mode === "edit") {
        await updateArea(modal.area.id, formData);
      } else {
        await createArea(formData);
      }
      refetch();
      setModal(null);
    } catch (e) {
      console.error("Error saving area:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (area: Area) => {
    if (!window.confirm(`¿Eliminar el área ${area.name}?`)) return;
    try {
      await removeArea(area.id);
      refetch();
    } catch (e) {
      console.error("Error deleting area:", e);
    }
  };

  return (
    <section aria-label="Áreas">
      <div className={styles["section-header"]}>
        <h3>Áreas</h3>
        <button
          type="button"
          className="icon-button"
          onClick={() => setModal({ mode: "create" })}
          aria-label="Nueva área"
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
        <p role="status">Cargando áreas…</p>
      ) : data.length === 0 && !error ? (
        <p role="status">No hay áreas registradas.</p>
      ) : (
        <ul className="record-list">
          {data.map((area) => (
            <li key={area.id} className="record">
              <span className="record-icon" aria-hidden="true">
                <FolderIcon />
              </span>
              <span className="record-text">
                {area.name}
                <span className="record-sep" aria-hidden="true">
                  ·
                </span>
                {area.code}
              </span>
              <span className="record-actions">
                <button
                  type="button"
                  className="icon-button icon-button--edit"
                  onClick={() => setModal({ mode: "edit", area })}
                  aria-label={`Editar ${area.name}`}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button--danger"
                  onClick={() => handleDelete(area)}
                  aria-label={`Eliminar ${area.name}`}
                >
                  <TrashIcon />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {modal != null && (
        <AreaForm
          key={modal.mode === "edit" ? modal.area.id : "new"}
          title={modal.mode === "edit" ? "Editar área" : "Nueva área"}
          submitLabel={modal.mode === "edit" ? "Guardar cambios" : "Crear"}
          initialData={
            modal.mode === "edit"
              ? {
                  code: modal.area.code,
                  name: modal.area.name,
                  active: modal.area.active,
                }
              : emptyArea
          }
          submitting={submitting}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}

export default AreasSection;
