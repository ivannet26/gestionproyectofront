import { useState } from "react";
import FileIcon from "../../shared/icons/FileIcon";
import EditIcon from "../../shared/icons/EditIcon";
import TrashIcon from "../../shared/icons/TrashIcon";
import PlusIcon from "../../shared/icons/PlusIcon";
import { useSpecialties } from "./useSpecialties";
import SpecialtyForm from "./SpecialtyForm/SpecialtyForm";
import {
  createSpecialty,
  removeSpecialty,
  updateSpecialty,
} from "../../core/services/organizationService";
import type {
  Specialty,
  SpecialtyWriteData,
} from "../../core/interfaces/organization.interface";
import styles from "./OrganizationPage.module.css";

type SpecialtyModal = { mode: "create" } | { mode: "edit"; specialty: Specialty };

const emptySpecialty: SpecialtyWriteData = { name: "" };

function SpecialtiesSection() {
  const { data, error, loading, refetch } = useSpecialties();
  const [modal, setModal] = useState<SpecialtyModal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData: SpecialtyWriteData) => {
    if (modal == null) return;
    setSubmitting(true);
    try {
      if (modal.mode === "edit") {
        await updateSpecialty(modal.specialty.id, formData);
      } else {
        await createSpecialty(formData);
      }
      refetch();
      setModal(null);
    } catch (e) {
      console.error("Error saving specialty:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (specialty: Specialty) => {
    if (!window.confirm(`¿Eliminar la especialidad ${specialty.name}?`)) return;
    try {
      await removeSpecialty(specialty.id);
      refetch();
    } catch (e) {
      console.error("Error deleting specialty:", e);
    }
  };

  return (
    <section aria-label="Especialidades">
      <div className={styles["section-header"]}>
        <h3>Especialidades</h3>
        <button
          type="button"
          className="icon-button"
          onClick={() => setModal({ mode: "create" })}
          aria-label="Nueva especialidad"
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
        <p role="status">Cargando especialidades…</p>
      ) : data.length === 0 && !error ? (
        <p role="status">No hay especialidades registradas.</p>
      ) : (
        <ul className="record-list">
          {data.map((specialty) => (
            <li key={specialty.id} className="record">
              <span className="record-icon" aria-hidden="true">
                <FileIcon />
              </span>
              <span className="record-text">{specialty.name}</span>
              <span className="record-actions">
                <button
                  type="button"
                  className="icon-button icon-button--edit"
                  onClick={() => setModal({ mode: "edit", specialty })}
                  aria-label={`Editar ${specialty.name}`}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button--danger"
                  onClick={() => handleDelete(specialty)}
                  aria-label={`Eliminar ${specialty.name}`}
                >
                  <TrashIcon />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {modal != null && (
        <SpecialtyForm
          key={modal.mode === "edit" ? modal.specialty.id : "new"}
          title={modal.mode === "edit" ? "Editar especialidad" : "Nueva especialidad"}
          submitLabel={modal.mode === "edit" ? "Guardar cambios" : "Crear"}
          initialData={
            modal.mode === "edit" ? { name: modal.specialty.name } : emptySpecialty
          }
          submitting={submitting}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}

export default SpecialtiesSection;
