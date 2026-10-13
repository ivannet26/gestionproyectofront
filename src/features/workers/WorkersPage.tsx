import { useState } from "react";
import StatusBadge from "../../shared/StatusBadge/StatusBadge";
import EditIcon from "../../shared/icons/EditIcon";
import { useWorkers } from "./useWorkers";
import WorkerForm from "./WorkerForm/WorkerForm";
import { updateWorker } from "../../core/services/workerService";
import type {
  Worker,
  WorkerUpdateData,
} from "../../core/interfaces/worker.interface";

function WorkersPage() {
  const { data, error, loading, refetch } = useWorkers();
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData: WorkerUpdateData) => {
    if (editingWorker == null) return;
    setSubmitting(true);
    try {
      await updateWorker(editingWorker.id, formData);
      refetch();
      setEditingWorker(null);
    } catch (e) {
      console.error("Error updating worker:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 p-6" id="main-content">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="max-w-[680px]">
          <h2 className="m-0 text-xl font-semibold text-neutral-900">Gestión de Trabajadores</h2>
          <p className="m-0 mt-1 text-sm text-neutral-600">Listado de trabajadores registrados y su disponibilidad.</p>
        </div>
      </header>
      {error && (
        <p className="border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-none" role="alert">
          {error.message}
        </p>
      )}
      {loading ? (
        <p role="status" className="text-sm text-neutral-600">Cargando trabajadores…</p>
      ) : data.length === 0 && !error ? (
        <p role="status" className="text-sm text-neutral-600">No hay trabajadores registrados.</p>
      ) : (
        <section className="bg-white border border-neutral-200 shadow-none">
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-sm text-neutral-600 text-left">
              <caption className="sr-only">Listado de trabajadores</caption>
              <thead>
                <tr className="border-b border-neutral-200">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-600 whitespace-nowrap">Código</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-600 whitespace-nowrap">Trabajador</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-600 whitespace-nowrap">Correo</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-600 whitespace-nowrap">Área</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-600 whitespace-nowrap">Horas/sem</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-600 whitespace-nowrap">Estado</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-600 whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((worker) => (
                  <tr key={worker.id} className="border-b border-neutral-200 last:border-b-0">
                    <td className="px-4 py-3">{worker.code}</td>
                    <td className="px-4 py-3 text-neutral-900">
                      {worker.first_names} {worker.last_names}
                    </td>
                    <td className="px-4 py-3">{worker.email}</td>
                    <td className="px-4 py-3">{worker.area ?? "—"}</td>
                    <td className="px-4 py-3">{worker.weekly_hours} h</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={worker.active ? "green" : "neutral"}>
                        {worker.active ? "Activo" : "Inactivo"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="grid place-items-center w-8 h-8 text-neutral-600 bg-white border border-neutral-200 cursor-pointer shadow-none"
                        onClick={() => setEditingWorker(worker)}
                        aria-label={`Editar ${worker.first_names} ${worker.last_names}`}
                      >
                        <EditIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {editingWorker != null && (
        <WorkerForm
          key={editingWorker.id}
          worker={editingWorker}
          submitting={submitting}
          onClose={() => setEditingWorker(null)}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  );
}

export default WorkersPage;
