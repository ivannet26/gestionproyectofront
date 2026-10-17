import { Link } from "react-router";
import gmLogo from "../../../assets/gm-logo.png";
import type { SessionUser } from "../../auth/api";
import { navigation } from "./sidebar-routes";
import TeamsMenu from "./TeamsMenu";
import ProfileMenu from "../../profile/ProfileMenu/ProfileMenu";

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
  const isAdmin = user.permissions.manage_accounts;

  return (
    <aside
      className={`sticky top-0 z-10 flex h-screen shrink-0 flex-col bg-white p-2 pb-4 border-r border-neutral-200 ${
        isCollapsed ? "w-20 items-center px-2" : "w-64"
      }`}
    >
      <div className="flex items-center justify-center py-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="cursor-pointer"
        >
          <img
            src={gmLogo}
            alt="GM Ingenieros y Consultores"
            className={`block h-auto brightness-105 ${isCollapsed ? "w-8" : "w-48"}`}
          />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1.5 mt-3">
          {navigation
            .filter((entry) => !entry.requiresAdmin || isAdmin)
            .map((entry) => {
              const Icon = entry.icon;
              const isActive = entry.path === currentPath;

              return (
                <Link
                  key={entry.path}
                  to={entry.path}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl ${
                    isActive
                      ? "bg-neutral-50 text-neutral-800"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
                  } ${isCollapsed ? "justify-center px-0" : ""}`}
                >
                  <span
                    className="size-5 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <Icon className="size-5" fill={false} />
                  </span>
                  {!isCollapsed && <span>{entry.label}</span>}
                </Link>
              );
            })}
          <TeamsMenu isCollapsed={isCollapsed} currentPath={currentPath} />
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
