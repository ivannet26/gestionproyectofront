import { useState } from "react";
import FileIcon from "../../../shared/icons/FileIcon";
import EditIcon from "../../../shared/icons/EditIcon";
import TrashIcon from "../../../shared/icons/TrashIcon";
import PlusIcon from "../../../shared/icons/PlusIcon";
import { useSpecialties } from "./useSpecialties";
import SpecialtyForm from "./SpecialtyForm/SpecialtyForm";
import EmptyState from "../../../shared/EmptyState/EmptyState";
import {
  createSpecialty,
  removeSpecialty,
  updateSpecialty,
} from "../../../core/services/organizationService";
import type {
  Specialty,
  SpecialtyWriteData,
} from "../../../core/interfaces/organization.interface";

type SpecialtyModal =
  | { mode: "create" }
  | { mode: "edit"; specialty: Specialty };

const emptySpecialty: SpecialtyWriteData = { name: "" };

function SpecialtiesSection() {
  const { data, refetch } = useSpecialties();
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
    <section aria-label="Especialidades" className="flex h-full flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-sm text-neutral-800">Especialidades</h3>
        <button
          type="button"
          className="bg-neutral-800 text-white hover:bg-neutral-700 px-3 py-1.5 text-xs rounded-md cursor-pointer inline-flex items-center gap-1.5"
          onClick={() => setModal({ mode: "create" })}
          aria-label="Nueva especialidad"
        >
          <PlusIcon className="size-4" />
          <span>Nueva especialidad</span>
        </button>
      </div>

      {data.length === 0 ? (
        <EmptyState
          iconName="specialties"
          message="No hay especialidades registradas."
        />
      ) : (
        <ul className="m-0 p-0 list-none space-y-0.5">
          {data.map((specialty) => (
            <li
              key={specialty.id}
              className="px-3 py-2 rounded-md hover:bg-neutral-50 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-neutral-600 flex-none" aria-hidden="true">
                  <FileIcon className="size-4" />
                </span>
                <span className="text-neutral-800 truncate">
                  {specialty.name}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 rounded-md cursor-pointer inline-flex items-center"
                  onClick={() => setModal({ mode: "edit", specialty })}
                  aria-label={`Editar ${specialty.name}`}
                >
                  <EditIcon className="size-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 rounded-md cursor-pointer inline-flex items-center"
                  onClick={() => handleDelete(specialty)}
                  aria-label={`Eliminar ${specialty.name}`}
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal != null && (
        <SpecialtyForm
          key={modal.mode === "edit" ? modal.specialty.id : "new"}
          title={
            modal.mode === "edit" ? "Editar especialidad" : "Nueva especialidad"
          }
          submitLabel={modal.mode === "edit" ? "Guardar cambios" : "Crear"}
          initialData={
            modal.mode === "edit"
              ? { name: modal.specialty.name }
              : emptySpecialty
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
