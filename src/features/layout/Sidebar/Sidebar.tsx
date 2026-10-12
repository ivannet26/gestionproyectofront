import { Link } from "react-router";
import gmLogo from "../../../assets/gm-logo.png";
import type { SessionUser } from "../../auth/api";
import { navigation } from "../../dashboard/mockData";
import LogoutIcon from "../../../shared/icons/LogoutIcon";
import ProfileIcon from "../../../shared/icons/ProfileIcon";
import { roleLabel } from "../../auth/roles";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  user: SessionUser;
  onLogout: () => void;
  currentPath: string;
}

function Sidebar({
  isCollapsed,
  onToggleCollapse,
  user,
  onLogout,
  currentPath,
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
