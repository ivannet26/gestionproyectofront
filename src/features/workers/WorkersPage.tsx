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
import styles from "./WorkersPage.module.css";

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
    <main className="dashboard" id="main-content">
      <header className="page-header">
        <div className={styles["workers-header"]}>
          <h2>Gestión de Trabajadores</h2>
          <p>Listado de trabajadores registrados y su disponibilidad.</p>
        </div>
      </header>
      {error && (
        <p className="form-message form-message--error" role="alert">
          {error.message}
        </p>
      )}
      {loading ? (
        <p role="status">Cargando trabajadores…</p>
      ) : data.length === 0 && !error ? (
        <p role="status">No hay trabajadores registrados.</p>
      ) : (
        <section>
          <div className="data-table-wrap">
            <table className="data-table">
              <caption className="sr-only">
                Listado de trabajadores
              </caption>
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Trabajador</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Área</th>
                  <th scope="col">Horas/sem</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((worker) => (
                  <tr key={worker.id}>
                    <td data-label="Código">{worker.code}</td>
                    <td data-label="Trabajador">
                      {worker.first_names} {worker.last_names}
                    </td>
                    <td data-label="Correo">{worker.email}</td>
                    <td data-label="Área">{worker.area ?? "—"}</td>
                    <td data-label="Horas/sem">{worker.weekly_hours} h</td>
                    <td data-label="Estado">
                      <StatusBadge tone={worker.active ? "green" : "neutral"}>
                        {worker.active ? "Activo" : "Inactivo"}
                      </StatusBadge>
                    </td>
                    <td
                      className="actions-cell"
                      data-label="Acciones"
                    >
                      <button
                        type="button"
                        className="icon-button icon-button--edit"
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
