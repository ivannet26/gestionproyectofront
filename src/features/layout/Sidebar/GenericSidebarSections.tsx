import { Link } from "react-router";
import PlusIcon from "../../../shared/Icons/PlusIcon";
import MyTeamsList from "./MyTeamsList";
import type { SubRoute } from "../../../routes";

interface GenericSidebarSectionsProps {
  visibleItems: SubRoute[];
  pathname: string;
  isTeams: boolean;
  canManage: boolean;
}

export default function GenericSidebarSections({
  visibleItems,
  pathname,
  isTeams,
  canManage,
}: GenericSidebarSectionsProps) {
  return (
    <>
      {isTeams && canManage && (
        <div className="mb-1 flex flex-col gap-0.5">
          <Link
            to="/equipos/todos?nuevo=equipo"
            className="badge"
          >
            <PlusIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Crear equipo</span>
          </Link>
        </div>
      )}

      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {visibleItems.map((item) => {
          const Icon = item.Icon;
          const active = pathname === item.path;
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                aria-current={active ? "page" : undefined}
                className={`badge ${
                  active
                    ? "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
                    : ""
                }`}
              >
                <Icon className="size-4 shrink-0" fill={false} />
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {isTeams && (
        <div className="my-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <p className="m-0 mb-3 px-3 text-xs text-neutral-400 dark:text-neutral-500">
            Mis equipos
          </p>
          <MyTeamsList currentPath={pathname} />
        </div>
      )}
    </>
  );
}
