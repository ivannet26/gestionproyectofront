import { Link } from "react-router";
import type { SessionUser } from "../../auth/api";
import ProfileMenu from "../../profile/ProfileMenu/ProfileMenu";
import InviteButton from "./InviteButton";
import type { NavModule } from "../../../routes";
import gmLogoSmall from "../../../assets/gm-logo-small.png";

interface AppSidebarProps {
  modules: NavModule[];
  activePath: string;
  user: SessionUser | null;
  onLogout: () => void;
  onSectionSelect: () => void;
}

export default function AppSidebar({
  modules,
  activePath,
  user,
  onLogout,
  onSectionSelect,
}: AppSidebarProps) {
  const canManage = user?.permissions.manage_accounts ?? false;
  const visibleModules = modules.filter((m) => !m.requiresAdmin || canManage);

  return (
    <aside className="flex w-16 shrink-0 flex-col items-center gap-2 rounded-lg bg-white px-2 py-3 dark:bg-neutral-900 max-md:w-full max-md:flex-row max-md:justify-between max-md:px-3 max-md:py-2 border border-neutral-200 dark:border-neutral-800">
      <Link
        to="/"
        onClick={onSectionSelect}
        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl"
        aria-label="Ir al inicio"
        title="Inicio"
      >
        <img
          src={gmLogoSmall}
          alt=""
          className="h-7 w-auto invert dark:invert-0"
        />
      </Link>

      <nav
        aria-label="Secciones principales"
        className="flex w-full min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden pt-1 max-md:flex-row max-md:justify-center max-md:overflow-visible max-md:pt-0"
      >
        {visibleModules.map((module) => {
          const Icon = module.Icon;
          const active = activePath === module.path;

          return (
            <Link
              key={module.path}
              to={module.path}
              onClick={onSectionSelect}
              aria-current={active ? "page" : undefined}
              title={module.label}
              className={`flex w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium ${
                active
                  ? "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              } max-md:w-auto max-md:flex-row max-md:gap-2 max-md:px-3`}
            >
              <Icon className="size-5" fill={false} />
              <span className="max-w-full min-w-0">{module.label}</span>
            </Link>
          );
        })}
        {canManage && <InviteButton />}
      </nav>

      {user && (
        <div className="mt-auto w-full pt-2 max-md:ml-auto max-md:mt-0 max-md:w-auto max-md:pt-0">
          <ProfileMenu user={user} onLogout={onLogout} isCollapsed />
        </div>
      )}
    </aside>
  );
}
