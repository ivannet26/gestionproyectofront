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
      <div className="flex items-center justify-between gap-3 px-5 mb-3">
        <h3 className="m-0 text-sm font-semibold text-neutral-900">Especialidades</h3>
        <button
          type="button"
          className="grid place-items-center w-8 h-8 text-neutral-900 bg-white border border-neutral-200 cursor-pointer shadow-none"
          onClick={() => setModal({ mode: "create" })}
          aria-label="Nueva especialidad"
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
        <p role="status" className="px-5 text-sm text-neutral-600">Cargando especialidades…</p>
      ) : data.length === 0 && !error ? (
        <p role="status" className="px-5 text-sm text-neutral-600">No hay especialidades registradas.</p>
      ) : (
        <ul className="m-0 px-5 list-none">
          {data.map((specialty) => (
            <li key={specialty.id} className="flex items-center gap-3 py-3 border-b border-neutral-200 last:border-b-0">
              <span className="grid place-items-center w-8 h-8 flex-none text-neutral-600" aria-hidden="true">
                <FileIcon />
              </span>
              <span className="flex-1 min-w-0 text-sm text-neutral-900">{specialty.name}</span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  className="grid place-items-center w-8 h-8 text-neutral-600 bg-white border border-neutral-200 cursor-pointer shadow-none"
                  onClick={() => setModal({ mode: "edit", specialty })}
                  aria-label={`Editar ${specialty.name}`}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="grid place-items-center w-8 h-8 text-neutral-600 bg-white border border-neutral-200 cursor-pointer shadow-none"
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
