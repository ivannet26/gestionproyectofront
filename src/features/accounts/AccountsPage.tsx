import { useState } from "react";

import InvitationModal from "./InvitationModal/InvitationModal";
import { useAccounts } from "./useAccounts";
import PlusIcon from "../../shared/icons/PlusIcon";
import SearchIcon from "../../shared/icons/SearchIcon";
import ChevronDownIcon from "../../shared/icons/ChevronDownIcon";
import UserIcon from "../../shared/icons/UserIcon";
import AtIcon from "../../shared/icons/AtIcon";
import StackIcon from "../../shared/icons/StackIcon";
import AdminIcon from "../../shared/icons/AdminIcon";
import ActivityIcon from "../../shared/icons/ActivityIcon";
import DotsIcon from "../../shared/icons/DotsIcon";
import { roleLabel } from "../auth/roles";

export default function AccountsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [activeInput, setActiveInput] = useState("");
  const [appliedActive, setAppliedActive] = useState<boolean | undefined>(
    undefined,
  );
  const { accounts, areas, busy, resendInvitation, reload } = useAccounts({
    search: appliedSearch || undefined,
    active: appliedActive,
  });
  const [inviting, setInviting] = useState(false);
  const hasFilters = appliedSearch !== "" || appliedActive !== undefined;

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setAppliedActive(activeInput === "" ? undefined : activeInput === "true");
  };

  const clearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setActiveInput("");
    setAppliedActive(undefined);
  };

  return (
    <main className="min-h-full bg-white text-neutral-800" id="main-content">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <h1 className="m-0 text-lg font-medium text-neutral-800">
            Cuentas y accesos
          </h1>
          <p className="m-0 mt-0.5 text-sm text-neutral-600">
            Registra trabajadores, asigna sus áreas y gestiona el acceso al
            sistema.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setInviting(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 cursor-pointer"
        >
          <PlusIcon className="size-4" />
          Registrar e invitar
        </button>
      </header>

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        <h2 className="m-0 mr-auto text-sm font-medium text-neutral-800">
          Cuentas{" "}
          <span className="font-normal text-neutral-600">
            ({accounts.length})
          </span>
        </h2>

        <div className="relative flex-1 min-w-48 max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600" />
          <input
            type="search"
            value={searchInput}
            maxLength={100}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar cuentas"
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-600 pl-8 pr-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none"
          />
        </div>

        <div className="relative">
          <select
            value={activeInput}
            aria-label="Filtrar por estado"
            onChange={(e) => setActiveInput(e.target.value)}
            className="bg-white border border-neutral-200 text-neutral-800 pl-3 pr-8 py-1.5 text-xs rounded-lg appearance-none focus:border-neutral-400 focus:outline-none cursor-pointer"
          >
            <option value="">Todas</option>
            <option value="true">Activas</option>
            <option value="false">Pendientes</option>
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600" />
        </div>

        <button
          type="submit"
          className="bg-neutral-800 text-white hover:bg-neutral-700 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer"
        >
          Buscar cuenta
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
                    Cuenta
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
                    <StackIcon className="size-4" />
                    Áreas
                  </span>
                </th>
                <th scope="col" className="p-3 items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <AdminIcon className="size-4" />
                    Rol
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
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className="border-b border-neutral-200 last:border-b-0 hover:bg-neutral-100"
                >
                  <td className="px-3 py-2.5 items-center">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {account.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 items-center">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {account.email}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 items-center">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {account.all_areas
                        ? "Todas las áreas activas"
                        : account.areas.map((area) => area.name).join(", ") ||
                          "Sin áreas activas"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 items-center">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {roleLabel(account.role)}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-2.5 items-center font-medium ${
                      account.active ? "text-green-500" : "text-yellow-400"
                    }`}
                  >
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {account.active ? "Activa" : "Pendiente"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 items-center">
                    <button
                      type="button"
                      disabled={busy || account.active}
                      onClick={() => resendInvitation(account.id)}
                      className="bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-100 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Reenviar invitación
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {accounts.length === 0 && (
          <p
            role="status"
            className="m-0 px-3 py-8 text-xs text-neutral-600 text-center"
          >
            {hasFilters
              ? "Sin cuentas para los filtros aplicados."
              : "No hay cuentas registradas."}
          </p>
        )}
      </section>

      {inviting && (
        <InvitationModal
          areas={areas}
          onClose={() => setInviting(false)}
          onUpdate={reload}
        />
      )}
    </main>
  );
}
