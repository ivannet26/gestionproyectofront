import { useState } from "react";
import { Link } from "react-router";
import ChevronDownIcon from "../../../shared/icons/ChevronDownIcon";
import TeamsIcon from "../../../shared/icons/TeamsIcon";
import { useTeams } from "../../organization/Teams/useTeams";

function TeamsMenu({
  isCollapsed,
  currentPath,
}: {
  isCollapsed: boolean;
  currentPath: string;
}) {
  const [open, setOpen] = useState(true);
  const { data } = useTeams();

  if (isCollapsed) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer mb-2"
      >
        Equipos
        <ChevronDownIcon className={`size-4 ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <ul className="m-0 p-0 list-none flex flex-col gap-2">
          {data
            .filter((team) => team.active)
            .map((team) => {
              const to = `/equipos/${team.id}`;
              const isActive = currentPath === to;
              return (
                <li key={team.id}>
                  <Link
                    to={to}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg cursor-pointer ${
                      isActive
                        ? "bg-neutral-100 text-neutral-800"
                        : "text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <TeamsIcon className="size-4 flex-none" />
                    <span className="min-w-0 flex-1 truncate">{team.name}</span>
                  </Link>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}

export default TeamsMenu;
