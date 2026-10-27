import { useState } from "react";
import { useParams } from "react-router";
import NotAvailable from "../layout/NotAvailable/NotAvailable";
import EmptyState from "../../shared/EmptyState/EmptyState";
import { avatarFor } from "../../shared/avatar";
import ActivityIcon from "../../shared/icons/ActivityIcon";
import ChevronDownIcon from "../../shared/icons/ChevronDownIcon";
import ClockIcon from "../../shared/icons/ClockIcon";
import DotsIcon from "../../shared/icons/DotsIcon";
import PlusIcon from "../../shared/icons/PlusIcon";
import Button from "../../shared/Button/Button";
import SearchIcon from "../../shared/icons/SearchIcon";
import TrashIcon from "../../shared/icons/TrashIcon";
import UserIcon from "../../shared/icons/UserIcon";
import TeamMembersModal from "../organization/Teams/TeamMembersModal";
import { useTeamDetail } from "../organization/Teams/useTeamDetail";

export default function TeamDetailPage() {
  const { teamId } = useParams();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { team, members, refetch, removeMember } = useTeamDetail(
    Number(teamId),
  );

  if (team == null) return <NotAvailable />;

  const query = search.trim().toLowerCase();
  const visible = members.filter(
    (m) =>
      (query === "" || m.worker_name.toLowerCase().includes(query)) &&
      (status === "" ||
        (status === "activo" ? m.left_date == null : m.left_date != null)),
  );

  const handleRemove = async (memberId: number) => {
    await removeMember(memberId);
  };

  return (
    <main className="min-h-full text-neutral-800 dark:text-neutral-100">
      <header className="mb-8">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-medium text-neutral-800 dark:text-neutral-100">{team.name}</h1>
          <span
            className={`text-xs font-medium ${team.active ? "text-green-500" : "text-red-600"}`}
          >
            {team.active ? "Activo" : "Inactivo"}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
          {team.area_name} · {members.length}{" "}
          {members.length === 1 ? "integrante" : "integrantes"}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <h2 className="mr-auto text-sm font-medium text-neutral-800 dark:text-neutral-100">
          Integrantes{" "}
          <span className="font-normal text-neutral-600 dark:text-neutral-400">
            ({visible.length})
          </span>
        </h2>
        <div className="relative flex-1 min-w-48 max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600 dark:text-neutral-400" />
          <input
            type="search"
            value={search}
            placeholder="Buscar por nombre"
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-600 dark:placeholder:text-neutral-500 pl-8 pr-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none"
          />
        </div>
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 pl-3 pr-8 py-1.5 text-xs rounded-lg appearance-none focus:border-neutral-400 focus:outline-none cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600 dark:text-neutral-400" />
        </div>
        <Button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5">
          <PlusIcon className="size-4" />
          Añadir integrante
        </Button>
      </div>

      <section className="border border-neutral-200 dark:border-neutral-800 overflow-hidden rounded-xl">
        {visible.length === 0 ? (
          <EmptyState
            iconName="teams"
            message={
              query !== "" || status !== ""
                ? "Sin resultados para los filtros aplicados."
                : "Este equipo no tiene integrantes."
            }
          />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-xs text-neutral-600 dark:text-neutral-400 text-left">
              <thead className="border-b border-neutral-200 dark:border-neutral-800 font-medium text-neutral-700 dark:text-neutral-300">
                <tr>
                  <th className="p-3">
                    <span className="inline-flex items-center gap-1.5">
                      <UserIcon className="size-4" />
                      Integrante
                    </span>
                  </th>
                  <th className="p-3">
                    <span className="inline-flex items-center gap-1.5">
                      <ClockIcon className="size-4" />
                      Ingreso
                    </span>
                  </th>
                  <th className="p-3 text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <ActivityIcon className="size-4" />
                      Estado
                    </span>
                  </th>
                  <th className="p-3 text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <DotsIcon className="size-4" />
                      Acciones
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((member) => {
                  const isActive = member.left_date == null;
                  return (
                    <tr
                      key={member.id}
                      className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            aria-hidden="true"
                            className="size-7 flex-none inline-flex items-center justify-center rounded-full bg-sky-500 text-[10px] font-medium text-white"
                          >
                            {avatarFor(member.worker_name)}
                          </span>
                          <span className="min-w-0 truncate text-neutral-800 dark:text-neutral-100">
                            {member.worker_name}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2">{member.joined_date}</td>
                      <td
                        className={`px-3 py-2 text-center font-medium ${isActive ? "text-green-500" : "text-red-600"}`}
                      >
                        {isActive ? "Activo" : "Inactivo"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => void handleRemove(member.id)}
                          aria-label={`Quitar a ${member.worker_name}`}
                          className="p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-100 rounded-lg cursor-pointer inline-flex items-center"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {adding && (
        <TeamMembersModal
          team={team}
          onClose={() => setAdding(false)}
          onChanged={() => void refetch()}
        />
      )}
    </main>
  );
}