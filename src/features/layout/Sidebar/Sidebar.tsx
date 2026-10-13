import { Fragment } from "react";
import { Link } from "react-router";
import gmLogo from "../../../assets/gm-logo.png";
import type { SessionUser } from "../../auth/api";
import type { ProjectSummary } from "../../projects/types";
import { navigation } from "../../dashboard/mockData";
import ProjectNavigation from "../../projects/ProjectNavigation/ProjectNavigation";
import LogoutIcon from "../../../shared/icons/LogoutIcon";
import ProfileIcon from "../../../shared/icons/ProfileIcon";
import ProjectsIcon from "../../../shared/icons/ProjectsIcon";
import { roleLabel } from "../../auth/roles";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  user: SessionUser;
  onLogout: () => void;
  canViewAdmin: boolean;
  currentPath: string;
  projects: ProjectSummary[];
  canCreateProject: boolean;
  projectCreationDisabled: boolean;
  onCreateProject: () => void;
  projectsLoading: boolean;
  projectError: string;
  canCreateTasks: boolean;
  onCreateTask: (projectId: number) => void;
  onRetryProjects: () => void;
}

function Sidebar({ isCollapsed, onToggleCollapse, user, onLogout, canViewAdmin, currentPath,
  projects, canCreateProject, projectCreationDisabled, onCreateProject, projectsLoading,
  projectError, canCreateTasks, onCreateTask, onRetryProjects }: SidebarProps) {
  const entries = [navigation[0]!, { label: "G. Proyectos", path: "/proyectos", icon: ProjectsIcon }, ...navigation.slice(1)]
    .filter((entry) => canViewAdmin || (entry.path !== "/trabajadores" && entry.path !== "/administracion"));
  return <aside className={`sticky top-0 z-10 flex h-screen min-w-0 flex-col border-r border-neutral-200 bg-white p-3 text-neutral-900 max-md:static max-md:h-auto max-md:max-h-[45dvh] ${isCollapsed ? "items-center px-2" : ""}`}>
    <div className="flex min-h-[78px] items-center justify-center max-md:min-h-14">
      <button className="cursor-pointer border-0 bg-white p-0 leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700" type="button"
        aria-label={isCollapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"} aria-expanded={!isCollapsed}
        aria-controls="sidebar-navigation" onClick={onToggleCollapse}>
        <img className={`block h-auto ${isCollapsed ? "w-[52px]" : "w-[204px] max-w-full"}`}
          src={gmLogo} alt="GM Ingenieros y Consultores" width={204} height={62} />
      </button>
    </div>
    <nav id="sidebar-navigation" className="min-w-0 flex-1 overflow-y-auto px-1" aria-label="Navegación principal">
      <div className={`flex flex-col gap-2 ${isCollapsed ? "mt-3" : "mt-5"}`}>
        {entries.map((entry) => {
          const Icon = entry.icon;
          const path = entry.path === "/administracion" ? "/administracion/cuentas" : entry.path;
          const isProjects = path === "/proyectos";
          const active = isProjects ? currentPath.startsWith("/proyectos") : path === currentPath;
          return <Fragment key={path}>
            <div className="flex min-w-0 items-center gap-1">
              <Link className={`flex min-h-11 min-w-0 items-center gap-2.5 rounded-md border-0 px-2.5 py-1.5 text-sm font-normal no-underline hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 ${active ? "bg-neutral-50 text-neutral-900" : "bg-white text-neutral-600"} ${isCollapsed ? "mx-auto w-12 justify-center p-1.5" : "w-full text-left"}`}
                to={path} aria-label={entry.label} title={entry.label} aria-current={path === currentPath ? "page" : undefined}>
                <span className="grid h-7 w-7 shrink-0 place-items-center text-neutral-600" aria-hidden="true"><Icon /></span>
                {!isCollapsed && <span>{entry.label}</span>}
              </Link>
              {isProjects && !isCollapsed && canCreateProject && <button type="button" aria-label="Crear proyecto" title="Crear proyecto"
                className="min-h-8 w-8 shrink-0 cursor-pointer rounded-md border border-neutral-200 bg-white text-lg hover:bg-neutral-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700"
                disabled={projectCreationDisabled} onClick={onCreateProject}>+</button>}
            </div>
            {isProjects && !isCollapsed && <section aria-label="Navegación de proyectos" className="ml-2 min-w-0">
              <Link to="/proyectos/resumen" aria-current={currentPath === "/proyectos/resumen" ? "page" : undefined}
                className="block min-h-9 rounded-md px-2.5 py-2 text-[13px] text-neutral-600 hover:bg-neutral-50 aria-[current=page]:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700">Resumen</Link>
              <ProjectNavigation projects={projects} currentPath={currentPath} loading={projectsLoading} error={projectError}
                canCreateTasks={canCreateTasks} onCreateTask={onCreateTask} onRetry={onRetryProjects} />
            </section>}
          </Fragment>;
        })}
      </div>
    </nav>
    <div className={`flex min-h-[60px] items-center gap-2.5 border-0 bg-white p-2 ${isCollapsed ? "w-[52px] flex-col justify-center p-1.5" : ""}`}
      role="group" aria-label={`${user.name}, ${roleLabel(user.role)}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center border-0 bg-neutral-200 text-xs font-medium text-neutral-600" aria-hidden="true"><ProfileIcon /></span>
      {!isCollapsed && <span className="flex min-w-0 flex-1 flex-col">
        <strong className="truncate text-xs leading-snug font-normal text-neutral-600">{user.name}</strong>
        <small className="mt-0.5 truncate text-xs leading-snug text-neutral-600">{roleLabel(user.role)}</small>
      </span>}
      <button className="flex shrink-0 cursor-pointer items-center rounded-md border-0 bg-white p-2 text-neutral-600 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700"
        type="button" onClick={onLogout} aria-label="Cerrar sesión"><LogoutIcon className="h-5 w-5" /></button>
    </div>
  </aside>;
}

export default Sidebar;
