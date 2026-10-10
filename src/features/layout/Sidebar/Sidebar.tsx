import { useState } from "react";
import { Link } from "react-router";
import gmLogo from "../../../assets/gm-logo.png";
import type { SessionUser } from "../../auth/api";
import type { ProjectSummary } from "../../projects/types";
import { administrationItem, navigationSections } from "../../dashboard/mockData";
import ModuleSwitcher from "../ModuleSwitcher/ModuleSwitcher";
import NavSection from "../NavSection/NavSection";
import { roleLabel } from "../../auth/roles";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  canViewAdmin?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  user: SessionUser;
  onLogout: () => void;
  currentPath: string;
  projects: ProjectSummary[];
  canCreateProject: boolean;
  projectCreationDisabled: boolean;
  onCreateProject: () => void;
  projectsLoading: boolean;
  projectError: string;
  canCreateTasks: boolean;
  onCreateTask: (projectId: number) => void;
}

function Sidebar({
  canViewAdmin = false,
  isCollapsed,
  onToggleCollapse,
  user,
  onLogout,
  currentPath,
  projects,
  canCreateProject,
  projectCreationDisabled,
  onCreateProject,
  projectsLoading,
  projectError,
  canCreateTasks,
  onCreateTask,
}: SidebarProps) {
  const [activeModule, setActiveModule] = useState(navigationSections[0].id);
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const activeSection =
    navigationSections.find((section) => section.id === activeModule) ??
    navigationSections[0];

  return (
    <aside
      className={`${styles["sidebar"]}${isCollapsed ? " sidebar--collapsed" : ""}`}
    >
      <div className={styles["sidebar__brand"]}>
        <span className={styles["sidebar__logo-frame"]}>
          <img
            className={styles["sidebar__logo"]}
            src={gmLogo}
            alt="GM Ingenieros y Consultores"
          />
        </span>
        <button
          className={styles["sidebar__collapse-button"]}
          type="button"
          aria-label={
            isCollapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"
          }
          aria-expanded={!isCollapsed}
          aria-controls="sidebar-navigation"
          title={isCollapsed ? "Mostrar menú" : "Ocultar menú"}
          onClick={onToggleCollapse}
        >
          <span
            className={styles["sidebar__collapse-chevron"]}
            aria-hidden="true"
          />
        </button>
      </div>

      <nav
        id="sidebar-navigation"
        className={styles["sidebar__nav"]}
        aria-label="Navegación principal"
      >
        <Link
          className={`${styles["sidebar__home"]}${currentPath === "/" ? "" : ` ${styles["sidebar__home--inactive"]}`}`}
          to="/"
          aria-label="Inicio"
          aria-current={currentPath === "/" ? "page" : undefined}
          title="Inicio"
        >
          <span className={styles["sidebar__nav-mark"]} aria-hidden="true">
            IN
          </span>
          <span className={styles["sidebar__nav-label"]}>Inicio</span>
        </Link>

        <div className={styles["sidebar__module-area"]}>
          <p className={styles["sidebar__label"]}>Módulos</p>
          <ModuleSwitcher
            sections={navigationSections}
            activeModule={activeModule}
            onChange={setActiveModule}
          />

          <div className={styles["sidebar__section-slot"]}>
            <NavSection section={activeSection} currentPath={currentPath}
              projects={projects} canCreateProject={canCreateProject}
              projectCreationDisabled={projectCreationDisabled} onCreateProject={onCreateProject}
              projectsLoading={projectsLoading} projectError={projectError}
              canCreateTasks={canCreateTasks} onCreateTask={onCreateTask} />
          </div>

          {canViewAdmin && administrationItem.requiresAuthorization && (
            <Link
              className={styles["sidebar__admin"]}
              to="/administracion/cuentas"
              aria-current={
                currentPath === "/administracion/cuentas" ? "page" : undefined
              }
            >
              {administrationItem.label}
            </Link>
          )}
        </div>
      </nav>

      <div
        className={styles["sidebar__profile"]}
        role="group"
        aria-label={`${user.name}, ${roleLabel(user.role)}`}
        title={`${user.name} · ${roleLabel(user.role)}`}
      >
        <span className={styles["sidebar__avatar"]} aria-hidden="true">
          {initials}
        </span>
        <span className={styles["sidebar__profile-copy"]}>
          <strong>{user.name}</strong>
          <small>{roleLabel(user.role)}</small>
        </span>
        <button
          className={styles["sidebar__logout"]}
          type="button"
          onClick={onLogout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          Salir
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
