import { useState } from "react";
import { Link } from "react-router";
import gmLogo from "../../../assets/gm-logo.png";
import type { SessionUser } from "../../auth/api";
import { navigation } from "../../dashboard/mockData";
import LogoutIcon from "../../../shared/icons/LogoutIcon";
import ProfileIcon from "../../../shared/icons/ProfileIcon";
import ProfileModal from "../../profile/ProfileModal";
import { roleLabel } from "../../auth/roles";

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
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <aside
      className={`sticky top-0 z-10 flex h-screen shrink-0 flex-col bg-white p-4 border-r border-neutral-200 ${
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
          {navigation.map((entry) => {
            const Icon = entry.icon;
            const isActive = entry.path === currentPath;

            return (
              <Link
                key={entry.path}
                to={entry.path}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md ${
                  isActive
                    ? "bg-neutral-100 text-neutral-800"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
                } ${isCollapsed ? "justify-center px-0" : ""}`}
              >
                <span
                  className="size-5 flex-none flex items-center justify-center"
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                {!isCollapsed && <span>{entry.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div
        className={`flex items-center ${
          isCollapsed ? "justify-center" : "justify-between"
        } gap-2 pt-3 border-t border-neutral-100`}
      >
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          aria-label="Abrir mi perfil"
          aria-haspopup="dialog"
          className={`flex min-w-0 ${
            isCollapsed
              ? "justify-center p-0"
              : "flex-1 items-center gap-2.5 p-1 text-left"
          } rounded-md hover:bg-neutral-50 cursor-pointer`}
        >
          <ProfileIcon
            className="size-8 flex-none text-neutral-600"
            aria-hidden="true"
          />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 text-left">
              <span className="truncate text-sm font-medium text-neutral-800 leading-tight">
                {user.name}
              </span>
              <span className="truncate text-xs text-neutral-600 leading-tight mt-0.5">
                {roleLabel(user.role)}
              </span>
            </div>
          )}
        </button>

        {!isCollapsed && (
          <button
            type="button"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            className="p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 rounded-full cursor-pointer flex-none inline-flex items-center"
          >
            <LogoutIcon className="size-4" />
          </button>
        )}
      </div>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </aside>
  );
}

export default Sidebar;
