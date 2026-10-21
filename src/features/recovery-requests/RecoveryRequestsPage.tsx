import { useState } from "react";
import { useRecoveryRequests } from "./useRecoveryRequests";
import UserIcon from "../../shared/icons/UserIcon";
import AtIcon from "../../shared/icons/AtIcon";
import ClockIcon from "../../shared/icons/ClockIcon";
import DotsIcon from "../../shared/icons/DotsIcon";
import SearchIcon from "../../shared/icons/SearchIcon";

export default function RecoveryRequestsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const { requests, busy, issueReset } = useRecoveryRequests({
    search: appliedSearch || undefined,
  });
  const hasFilters = appliedSearch !== "";

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
  };

  return (
    <main className="min-h-screen bg-white text-neutral-800" id="main-content">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <h1 className="m-0 text-lg font-medium text-neutral-800">
            Solicitudes de recuperación
          </h1>
          <p className="m-0 mt-0.5 text-sm text-neutral-600">
            Verifica la identidad antes de emitir el enlace de restablecimiento.
          </p>
        </div>
      </header>

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        <h2 className="m-0 mr-auto text-sm font-medium text-neutral-800">
          Solicitudes{" "}
          <span className="font-normal text-neutral-600">
            ({requests.length})
          </span>
        </h2>

        <div className="relative flex-1 min-w-48 max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600" />
          <input
            type="search"
            value={searchInput}
            maxLength={100}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar solicitudes"
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-600 pl-8 pr-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="bg-neutral-800 text-white hover:bg-neutral-700 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer"
        >
          Buscar solicitud
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-neutral-700 hover:text-neutral-800 px-2 py-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer"
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
                    Solicitante
                  </span>
                </th>
                <th scope="col" className="p-3 items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <AtIcon className="size-4" />
                    Correo
                  </span>
                </th>
                <th scope="col" className="p-3 items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="size-4" />
                    Solicitada
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
              {requests.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-neutral-200 last:border-b-0 hover:bg-neutral-100"
                >
                  <td className="px-3 py-2.5 items-center">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {entry.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 items-center">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {entry.email}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 items-center">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {new Date(entry.requested_at).toLocaleString("es-PE")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 items-center">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => issueReset(entry.id)}
                      className="bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-100 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Verificar y enviar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {requests.length === 0 && (
          <p
            role="status"
            className="m-0 px-3 py-8 text-xs text-neutral-600 text-center"
          >
            {hasFilters
              ? "Sin solicitudes para los filtros aplicados."
              : "No hay solicitudes pendientes."}
          </p>
        )}
      </section>
    </main>
  );
}
