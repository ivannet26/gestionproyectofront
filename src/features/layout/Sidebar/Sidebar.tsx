import { Link } from "react-router";
import gmLogo from "../../../assets/gm-logo.png";
import type { SessionUser } from "../../auth/api";
<<<<<<< HEAD
import { navigation } from "../../dashboard/mockData";
import LogoutIcon from "../../../shared/icons/LogoutIcon";
import ProfileIcon from "../../../shared/icons/ProfileIcon";
=======
import type { ProjectSummary } from "../../projects/types";
import { administrationItem, navigationSections } from "../../dashboard/mockData";
import ModuleSwitcher from "../ModuleSwitcher/ModuleSwitcher";
import NavSection from "../NavSection/NavSection";
>>>>>>> 47dc5b9c738548e13591fced629cd8c8aa1effdc
import { roleLabel } from "../../auth/roles";
import styles from "./Sidebar.module.css";

interface SidebarProps {
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
  return (
    <aside
      className={`${styles["sidebar"]}${isCollapsed ? " sidebar--collapsed" : ""}`}
    >
      <div className={styles["brand"]}>
        <button
          className={styles["logo-button"]}
          type="button"
          onClick={onToggleCollapse}
        >
          <img
            className={styles["logo"]}
            src={gmLogo}
            alt="GM Ingenieros y Consultores"
          />
        </button>
      </div>

<<<<<<< HEAD
      <nav className={styles["nav"]}>
        <div className={styles["module-area"]}>
          {navigation.map((entry) => {
            const Icon = entry.icon;
            const isActive = entry.path === currentPath;
            return (
              <Link
                key={entry.path}
                className={`${styles["home"]}${isActive ? "" : ` ${styles["home--inactive"]}`}`}
                to={entry.path}
                aria-current={isActive ? "page" : undefined}
              >
                <span className={styles["nav-mark"]} aria-hidden="true">
                  <Icon />
                </span>
                <span className={styles["nav-label"]}>{entry.label}</span>
              </Link>
            );
          })}
=======
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
>>>>>>> 47dc5b9c738548e13591fced629cd8c8aa1effdc
        </div>
      </nav>

      <div className={styles["profile"]}>
        <span className={styles["avatar"]} aria-hidden="true">
          <ProfileIcon />
        </span>
        <span className={styles["profile-copy"]}>
          <strong>{user.name}</strong>
          <small>{roleLabel(user.role)}</small>
        </span>
        <button className={styles["logout"]} type="button" onClick={onLogout}>
          <LogoutIcon />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
