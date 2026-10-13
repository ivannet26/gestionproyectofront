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
      <div className="flex items-center justify-between gap-3 px-5 mb-3">
        <h3 className="m-0 text-sm font-semibold text-neutral-900">Áreas</h3>
        <button
          type="button"
          className="grid place-items-center w-8 h-8 text-neutral-900 bg-white border border-neutral-200 cursor-pointer shadow-none"
          onClick={() => setModal({ mode: "create" })}
          aria-label="Nueva área"
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
        <p role="status" className="px-5 text-sm text-neutral-600">Cargando áreas…</p>
      ) : data.length === 0 && !error ? (
        <p role="status" className="px-5 text-sm text-neutral-600">No hay áreas registradas.</p>
      ) : (
        <ul className="m-0 px-5 list-none">
          {data.map((area) => (
            <li key={area.id} className="flex items-center gap-3 py-3 border-b border-neutral-200 last:border-b-0">
              <span className="grid place-items-center w-8 h-8 flex-none text-neutral-600" aria-hidden="true">
                <FolderIcon />
              </span>
              <span className="flex-1 min-w-0 text-sm text-neutral-900">
                {area.name}
                <span className="mx-1 text-neutral-600" aria-hidden="true">
                  ·
                </span>
                {area.code}
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  className="grid place-items-center w-8 h-8 text-neutral-600 bg-white border border-neutral-200 cursor-pointer shadow-none"
                  onClick={() => setModal({ mode: "edit", area })}
                  aria-label={`Editar ${area.name}`}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="grid place-items-center w-8 h-8 text-neutral-600 bg-white border border-neutral-200 cursor-pointer shadow-none"
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
