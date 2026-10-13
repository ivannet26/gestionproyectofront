import { Link } from "react-router";
import gmLogo from "../../../assets/gm-logo.png";
import type { SessionUser } from "../../auth/api";
import { navigation } from "../../dashboard/mockData";
import LogoutIcon from "../../../shared/icons/LogoutIcon";
import ProfileIcon from "../../../shared/icons/ProfileIcon";
import { roleLabel } from "../../auth/roles";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  user: SessionUser;
  onLogout: () => void;
  currentPath: string;
  projects: any[];
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
}: SidebarProps) {
  return (
    <aside className={`sticky top-0 z-10 flex h-screen min-w-0 flex-col bg-white p-3 text-neutral-900 border-r border-neutral-200 shadow-none ${isCollapsed ? "items-center px-2" : ""}`}>
      <div className="flex items-center justify-center min-h-[78px]">
        <button
          className="p-0 bg-white border-0 cursor-pointer leading-none"
          type="button"
          onClick={onToggleCollapse}
        >
          <img
            className={`block h-auto ${isCollapsed ? "w-[52px]" : "w-[204px] max-w-full"}`}
            src={gmLogo}
            alt="GM Ingenieros y Consultores"
          />
        </button>
      </div>
      <nav className="min-w-0 flex-1 overflow-y-auto px-1">
        <div className={`flex flex-col gap-2 ${isCollapsed ? "mt-3" : "mt-5"}`}>
          {navigation.map((entry) => {
            const Icon = entry.icon;
            const isActive = entry.path === currentPath;
            return (
              <Link
                key={entry.path}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 min-h-11 text-sm font-normal no-underline border-0 shadow-none ${isActive ? "text-neutral-900 bg-neutral-50" : "text-neutral-600 bg-white"} ${isCollapsed ? "w-12 justify-center p-1.5 mx-auto" : "w-full text-left"}`}
                to={entry.path}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="grid w-7 h-7 flex-none place-items-center text-neutral-600" aria-hidden="true">
                  <Icon />
                </span>
                {!isCollapsed && <span>{entry.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className={`flex items-center gap-2.5 min-h-[60px] p-2 bg-white border-0 shadow-none ${isCollapsed ? "w-[52px] flex-col justify-center p-1.5" : ""}`}>
        <span className="grid w-9 h-9 flex-none place-items-center text-neutral-600 text-xs font-medium bg-neutral-200 border-0" aria-hidden="true">
          <ProfileIcon />
        </span>
        {!isCollapsed && (
          <span className="flex flex-col flex-1 min-w-0">
            <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-neutral-600 text-xs font-normal leading-snug">{user.name}</strong>
            <small className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-neutral-600 text-xs leading-snug">{roleLabel(user.role)}</small>
          </span>
        )}
        <button className="flex flex-none items-center text-neutral-600 bg-white border-0 cursor-pointer p-2" type="button" onClick={onLogout} aria-label="Cerrar sesión">
          <LogoutIcon className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;