import { useEffect, useState } from "react";
import ActivityIcon from "../../shared/icons/ActivityIcon";
import ChevronDownIcon from "../../shared/icons/ChevronDownIcon";
import ClockIcon from "../../shared/icons/ClockIcon";
import DotsIcon from "../../shared/icons/DotsIcon";
import FileIcon from "../../shared/icons/FileIcon";
import SearchIcon from "../../shared/icons/SearchIcon";
import UserIcon from "../../shared/icons/UserIcon";
import XIcon from "../../shared/icons/XIcon";
import { useAbsences } from "./useAbsences";
import { useToast } from "../../hooks/useToast";
import type {
  Absence,
  AbsenceStatus,
} from "../../core/interfaces/absence.interface";
import { absenceStatus } from "../../core/interfaces/absence.interface";

const statusMeta: Record<AbsenceStatus, { label: string; tone: string }> = {
  pendiente: { label: "Pendiente", tone: "text-yellow-400" },
  aprobada: { label: "Aprobada", tone: "text-green-500" },
  anulada: { label: "Anulada", tone: "text-red-600" },
};

function AbsencesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [appliedStatus, setAppliedStatus] = useState<AbsenceStatus | undefined>(
    undefined,
  );
  const { data, error, review } = useAbsences({
    search: appliedSearch || undefined,
    status: appliedStatus,
  });
  const { addToast } = useToast();
  const [reviewing, setReviewing] = useState<Absence | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hasFilters = appliedSearch !== "" || appliedStatus !== undefined;

  useEffect(() => {
    if (error != null) {
      addToast({
        icon: "error",
        title: "Error al cargar",
        message: "No se pudieron cargar las ausencias.",
      });
    }
  }, [error, addToast]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setAppliedStatus((statusInput || undefined) as AbsenceStatus | undefined);
  };

  const clearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setStatusInput("");
    setAppliedStatus(undefined);
  };

  const openReview = (absence: Absence) => {
    setReviewing(absence);
  };

  const handleReview = async (aprobada: boolean) => {
    if (reviewing == null) return;
    setSubmitting(true);
    try {
      await review(reviewing.id, aprobada);
      addToast({
        icon: "success",
        title: aprobada ? "Ausencia aprobada" : "Ausencia anulada",
        message: `${reviewing.trabajador_nombre}: de ${reviewing.fecha_inicio} a ${reviewing.fecha_fin}.`,
      });
      setReviewing(null);
    } catch (failure) {
      addToast({
        icon: "error",
        title: "Error al revisar",
        message:
          failure instanceof Error ? failure.message : "No se pudo revisar.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-neutral-800">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <h1 className="m-0 text-lg font-medium text-neutral-800">
            Revisión de ausencias
          </h1>
          <p className="m-0 mt-0.5 text-sm text-neutral-600">
            Solicitudes de ausencia pendientes de aprobación.
          </p>
        </div>
      </header>

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        <h2 className="m-0 mr-auto text-sm font-medium text-neutral-800">
          Ausencias{" "}
          <span className="font-normal text-neutral-600">({data.length})</span>
        </h2>

        <div className="relative flex-1 min-w-48 max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600" />
          <input
            type="search"
            value={searchInput}
            maxLength={100}
            placeholder="Buscar por trabajador o motivo"
            aria-label="Buscar ausencias"
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-600 pl-8 pr-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none"
          />
        </div>

        <div className="relative">
          <select
            value={statusInput}
            aria-label="Filtrar por estado"
            onChange={(e) => setStatusInput(e.target.value)}
            className="bg-white border border-neutral-200 text-neutral-800 pl-3 pr-8 py-1.5 text-xs rounded-lg appearance-none focus:border-neutral-400 focus:outline-none cursor-pointer"
          >
            <option value="">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobada">Aprobadas</option>
            <option value="anulada">Anuladas</option>
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600" />
        </div>

        <button
          type="submit"
          className="bg-neutral-800 text-white hover:bg-neutral-700 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Buscar ausencia
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-neutral-700 hover:text-neutral-800 px-2 py-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer"
          >
            Limpiar
          </button>
        )}
      </form>

      <section className="bg-white border border-neutral-200 overflow-hidden rounded-xl">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-xs text-neutral-600 text-left">
            <thead className="border-b border-neutral-200 font-medium text-neutral-700">
              <tr>
                <th scope="col" className="p-3 items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <UserIcon className="size-4" />
                    Trabajador
                  </span>
                </th>
                <th scope="col" className="p-3 items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <FileIcon className="size-4" />
                    Motivo
                  </span>
                </th>
                <th scope="col" className="p-3 items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="size-4" />
                    Inicio
                  </span>
                </th>
                <th scope="col" className="p-3 items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="size-4" />
                    Fin
                  </span>
                </th>
                <th scope="col" className="p-3 items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <ActivityIcon className="size-4" />
                    Estado
                  </span>
                </th>
                <th scope="col" className="p-3 items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <DotsIcon className="size-4" />
                    Acciones
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((absence) => {
                const status = absenceStatus(absence);
                const meta = statusMeta[status];
                return (
                  <tr
                    key={absence.id}
                    className="border-b border-neutral-200 last:border-b-0 hover:bg-neutral-50"
                  >
                    <td className="px-3 py-2.5 items-center">
                      <span className="flex items-center min-w-0 line-clamp-1">
                        {absence.trabajador_nombre}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 items-center">
                      <span className="flex items-center min-w-0 line-clamp-1">
                        {absence.motivo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 items-center">
                      <span className="flex items-center min-w-0 line-clamp-1">
                        {absence.fecha_inicio}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 items-center">
                      <span className="flex items-center min-w-0 line-clamp-1">
                        {absence.fecha_fin}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2.5 items-center font-medium ${meta.tone}`}
                    >
                      <span className="flex items-center min-w-0 line-clamp-1">
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 items-center">
                      <button
                        type="button"
                        disabled={status !== "pendiente"}
                        onClick={() => openReview(absence)}
                        className="bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-50 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Revisar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data.length === 0 && (
          <p
            role="status"
            className="m-0 px-3 py-8 text-xs text-neutral-600 text-center"
          >
            {hasFilters
              ? "Sin ausencias para los filtros aplicados."
              : "Sin ausencias registradas."}
          </p>
        )}
      </section>

      {reviewing != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-xl">
            <header className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
              <h3 className="m-0 text-sm font-medium text-neutral-800">
                Revisar ausencia
              </h3>
              <button
                type="button"
                onClick={() => setReviewing(null)}
                aria-label="Cerrar"
                className="p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 rounded-full cursor-pointer inline-flex items-center justify-center"
              >
                <XIcon className="size-4" />
              </button>
            </header>

            <div className="p-5 flex flex-col gap-3 text-xs text-neutral-600">
              <p className="m-0">
                <span className="font-medium text-neutral-800">
                  {reviewing.trabajador_nombre}
                </span>
              </p>
              <p className="m-0">
                <span className="font-medium text-neutral-800">Inicio:</span>{" "}
                {reviewing.fecha_inicio}
              </p>
              <p className="m-0">
                <span className="font-medium text-neutral-800">Fin:</span>{" "}
                {reviewing.fecha_fin}
              </p>
              <p className="m-0">{reviewing.motivo}</p>
            </div>

            <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-neutral-200">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleReview(false)}
                className="bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-50 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Revisando…" : "Anular"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleReview(true)}
                className="bg-neutral-800 text-white hover:bg-neutral-700 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Revisando…" : "Aprobar"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}

export default AbsencesPage;
