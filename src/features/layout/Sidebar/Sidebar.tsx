import { Link } from "react-router";
import gmLogo from "../../../assets/gm-logo.png";
import type { SessionUser } from "../../auth/api";
import ProfileMenu from "../../profile/ProfileMenu/ProfileMenu";
import type { ProjectsMenuProps } from "../../projects/types";
import ProjectsMenu from "./ProjectsMenu";
import { navigation } from "./sidebar-routes";
import TeamsMenu from "./TeamsMenu";

interface SidebarProps extends ProjectsMenuProps {
  onToggleCollapse: () => void;
  user: SessionUser;
  onLogout: () => void;
}

function Sidebar({
  isCollapsed,
  onToggleCollapse,
  user,
  onLogout,
  currentPath,
  projects,
  projectsLoading,
  projectError,
  onRetryProjects,
  canCreateProject,
  projectCreationDisabled,
  onCreateProject,
  canCreateTasks,
  onCreateTask,
}: SidebarProps) {
  const isAdmin = user.permissions.manage_accounts;
  const entries = navigation.filter(
    (entry) => !entry.requiresAdmin || isAdmin,
  );
  return (
    <aside
      className={`sticky top-0 z-10 flex h-screen min-w-0 shrink-0 flex-col bg-white p-2 pb-4 border-r border-neutral-200 max-md:static max-md:h-auto max-md:max-h-[45dvh] max-md:w-full max-md:border-r-0 max-md:border-b ${isCollapsed ? "w-20 items-center px-2" : "w-64"
        }`}
    >
      <div className="flex items-center justify-center py-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"}
          aria-expanded={!isCollapsed}
          aria-controls="sidebar-navigation"
          className="cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700"
        >
          <img
            src={gmLogo}
            alt="GM Ingenieros y Consultores"
            width={204}
            height={62}
            className={`block h-auto brightness-105 ${isCollapsed ? "w-8" : "w-48"}`}
          />
        </button>
      </div>

      <nav
        id="sidebar-navigation"
        aria-label="Navegación principal"
        className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="flex flex-col gap-1.5 mt-3">
          {entries.map((entry) => {
            const Icon = entry.icon;
            const isActive = entry.path === currentPath;

            return (
              <Link
                key={entry.path}
                to={entry.path}
                aria-label={entry.label}
                title={entry.label}
                aria-current={entry.path === currentPath ? "page" : undefined}
                className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-sm rounded-md cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-700 ${isActive
                  ? "bg-neutral-50 text-neutral-800"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
                  } ${isCollapsed ? "justify-center px-0" : ""}`}
              >
                <span
                  className="size-5 shrink-0 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <Icon className="size-5" fill={false} />
                </span>
                {!isCollapsed && <span>{entry.label}</span>}
              </Link>
            );
          })}
          <div className="mt-3">
            <ProjectsMenu
              isCollapsed={isCollapsed}
              currentPath={currentPath}
              projects={projects}
              projectsLoading={projectsLoading}
              projectError={projectError}
              onRetryProjects={onRetryProjects}
              canCreateProject={canCreateProject}
              projectCreationDisabled={projectCreationDisabled}
              onCreateProject={onCreateProject}
              canCreateTasks={canCreateTasks}
              onCreateTask={onCreateTask}
            />
            <TeamsMenu isCollapsed={isCollapsed} currentPath={currentPath} />
          </div>
        </div>
      </nav>

      <div className="pt-3 border-t border-neutral-200">
        <ProfileMenu
          user={user}
          onLogout={onLogout}
          isCollapsed={isCollapsed}
        />
      </div>
    </aside>
  );
}

export default Sidebar;
