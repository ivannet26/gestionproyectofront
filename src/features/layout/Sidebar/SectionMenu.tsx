import { Link } from "react-router";
import PlusIcon from "../../../shared/Icons/PlusIcon";
import SectionMenuActions from "./SectionMenuActions";
import ProjectSidebarList from "./ProjectSidebarList";
import MyTeamsList from "./MyTeamsList";
import type { NavModule } from "../../../routes";
import SidebarIcon from "../../../shared/Icons/SidebarIcon";

interface SectionMenuProps {
  activeModule: NavModule;
  pathname: string;
  canManage: boolean;
  onClose: () => void;
}

export default function SectionMenu({
  activeModule,
  pathname,
  canManage,
  onClose,
}: SectionMenuProps) {
  const visibleItems = activeModule.subRoutes.filter(
    (item) => !item.path.includes(":") && !item.hidden,
  );
  const activeItem = visibleItems.reduce<(typeof visibleItems)[number] | null>(
    (best, item) => {
      const matches =
        item.path === "/"
          ? pathname === "/"
          : pathname === item.path || pathname.startsWith(`${item.path}/`);
      return matches && (best == null || item.path.length > best.path.length)
        ? item
        : best;
    },
    null,
  );

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col md:max-h-none md:w-60 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <header className="flex items-center justify-between gap-2 p-4">
        <h2 className="m-0 text-sm font-medium text-neutral-800 dark:text-neutral-100">
          {activeModule.label}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Ocultar panel"
          className="cursor-pointer rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <SidebarIcon className="size-4" />
        </button>
      </header>

      <nav
        aria-label={`Opciones de ${activeModule.label}`}
        className="min-h-0 flex-1 overflow-y-auto px-2"
      >
        {activeModule.path === "/" && <SectionMenuActions />}

        {activeModule.path === "/equipos" && canManage && (
          <div className="mb-1 flex flex-col gap-0.5">
            <Link
              to="/equipos?nuevo=equipo"
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <PlusIcon className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">Crear equipo</span>
            </Link>
          </div>
        )}

        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {visibleItems.map((item) => {
            const Icon = item.Icon;
            const active = item.path === activeItem?.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
                    active
                      ? "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  }`}
                >
                  <Icon className="size-4 shrink-0" fill={false} />
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {activeModule.path === "/" && (
          <div className="mt-2 border-t border-neutral-200 pt-2 dark:border-neutral-800">
            <ProjectSidebarList currentPath={pathname} />
          </div>
        )}

        {activeModule.path === "/equipos" && (
          <div className="my-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <p className="m-0 mb-3 px-3 text-xs text-neutral-400 dark:text-neutral-500">
              Mis equipos
            </p>
            <MyTeamsList currentPath={pathname} />
          </div>
        )}
      </nav>
    </aside>
  );
}
