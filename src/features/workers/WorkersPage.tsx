import { useState } from "react";
import StatusBadge from "../../shared/StatusBadge/StatusBadge";
import EditIcon from "../../shared/icons/EditIcon";
import SearchIcon from "../../shared/icons/SearchIcon";
import ChevronDownIcon from "../../shared/icons/ChevronDownIcon";
import { useWorkers } from "./useWorkers";
import WorkerForm from "./WorkerForm/WorkerForm";
import { updateWorker } from "../../core/services/workerService";
import type {
  Worker,
  WorkerUpdateData,
} from "../../core/interfaces/worker.interface";

function WorkersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [disponibleInput, setDisponibleInput] = useState("");
  const [disponible, setDisponible] = useState<boolean | undefined>(undefined);
  const { data, loading, refetch } = useWorkers({
    search: appliedSearch || undefined,
    disponible,
  });
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hasFilters = appliedSearch !== "" || disponible !== undefined;

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setDisponible(
      disponibleInput === "" ? undefined : disponibleInput === "true",
    );
  };

  const clearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setDisponibleInput("");
    setDisponible(undefined);
  };

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
    <main className="min-h-screen bg-white text-neutral-800">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <h1 className="m-0 text-lg font-medium text-neutral-800">
            Gestión de Trabajadores
          </h1>
          <p className="m-0 mt-0.5 text-sm text-neutral-600">
            Listado de trabajadores registrados y su disponibilidad.
          </p>
        </div>
      </header>

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-center gap-2 mb-4"
      >
        <h2 className="m-0 mr-auto text-sm font-medium text-neutral-800">
          Trabajadores{" "}
          <span className="font-normal text-neutral-600">({data.length})</span>
        </h2>

        <div className="relative flex-1 min-w-48 max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600" />
          <input
            type="search"
            value={searchInput}
            maxLength={100}
            placeholder="Buscar por nombre, apellido o código"
            aria-label="Buscar trabajadores"
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-600 pl-8 pr-3 py-1.5 text-xs rounded-md focus:border-neutral-400 focus:outline-none"
          />
        </div>

        <div className="relative">
          <select
            value={disponibleInput}
            aria-label="Filtrar por disponibilidad"
            onChange={(e) => setDisponibleInput(e.target.value)}
            className="bg-white border border-neutral-200 text-neutral-800 pl-3 pr-8 py-1.5 text-xs rounded-md appearance-none focus:border-neutral-400 focus:outline-none cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="true">Sin proyecto</option>
            <option value="false">Con proyecto</option>
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600" />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-neutral-800 text-white hover:bg-neutral-700 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Buscar trabajador
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-neutral-700 hover:text-neutral-800 px-2 py-1.5 rounded-md hover:bg-neutral-100 cursor-pointer"
          >
            Limpiar
          </button>
        )}
      </form>

      <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-xs text-neutral-600 text-left">
            <caption className="sr-only">Listado de trabajadores</caption>
            <thead className="border-b border-neutral-200 font-medium text-neutral-700">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Código
                </th>
                <th scope="col" className="px-3 py-2">
                  Trabajador
                </th>
                <th scope="col" className="px-3 py-2">
                  Correo
                </th>
                <th scope="col" className="px-3 py-2">
                  Área
                </th>
                <th scope="col" className="px-3 py-2">
                  Horas/sem
                </th>
                <th scope="col" className="px-3 py-2">
                  Estado
                </th>
                <th scope="col" className="px-3 py-2">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((worker) => (
                <tr
                  key={worker.id}
                  className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
                >
                  <td className="px-3 py-2 font-medium text-neutral-700">
                    {worker.code}
                  </td>
                  <td className="px-3 py-2 font-medium text-neutral-800">
                    {worker.first_names} {worker.last_names}
                  </td>
                  <td className="px-3 py-2">{worker.email}</td>
                  <td className="px-3 py-2">{worker.area ?? "—"}</td>
                  <td className="px-3 py-2">{worker.weekly_hours} h</td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={worker.active ? "green" : "neutral"}>
                      {worker.active ? "Activo" : "Inactivo"}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 rounded-md cursor-pointer inline-flex items-center"
                      onClick={() => setEditingWorker(worker)}
                      aria-label={`Editar ${worker.first_names} ${worker.last_names}`}
                    >
                      <EditIcon className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
