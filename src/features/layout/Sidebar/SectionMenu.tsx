import HomeSidebarSections from "./HomeSidebarSections";
import GenericSidebarSections from "./GenericSidebarSections";
import { useProjects } from "../../home/hooks/useProjects";
import { projectPath } from "../../../routes";
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
  const { projects } = useProjects();
  const isHome = activeModule.path === "/";
  const isTeams = activeModule.path.startsWith("/equipos");
  const visibleItems = activeModule.subRoutes.filter(
    (item) => !item.path.includes(":") && !item.hidden,
  );

  const activeProject =
    projects.find((p) => pathname.startsWith(projectPath(p.id))) ??
    projects[0] ??
    null;

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 md:w-60">
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
        className="min-h-0 flex-1 overflow-y-auto px-3"
      >
        {isHome ? (
          <HomeSidebarSections
            projects={projects}
            activeProject={activeProject}
            pathname={pathname}
            visibleItems={visibleItems}
            activePath={pathname}
          />
        ) : (
          <GenericSidebarSections
            visibleItems={visibleItems}
            pathname={pathname}
            isTeams={isTeams}
            canManage={canManage}
          />
        )}
      </nav>
    </aside>
  );
}
