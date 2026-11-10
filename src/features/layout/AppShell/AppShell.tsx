import { Suspense, useState, useMemo } from "react";
import { Route, Routes, useLocation, matchPath } from "react-router";
import { appModules } from "../../../routes";
import type { SessionUser } from "../../auth/api";
import NotAvailable from "../NotAvailable/NotAvailable";
import AppSidebar from "../Sidebar/AppSidebar";
import SectionMenu from "../Sidebar/SectionMenu";
import SectionMenuHighlights from "../Sidebar/SectionMenuHighlights";

interface AppShellProps {
  user: SessionUser;
  onLogout: () => void;
  logoutError?: string;
}

export default function AppShell({ user, onLogout }: AppShellProps) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(true);
  const canViewAdmin = user.permissions.manage_accounts;

  const activeModule = useMemo(() => {
    const matched = appModules.filter((module) =>
      module.subRoutes.some((sub) => matchPath(sub.path, pathname)),
    );
    if (matched.length === 0) return appModules[0];
    if (matched.length === 1) return matched[0];
    return matched.find((m) => m.path !== "/") || matched[0];
  }, [pathname]);

  const allRoutes = useMemo(() => {
    return appModules.flatMap((module) =>
      module.subRoutes.map((sub) => ({
        ...sub,
        requiresAdmin: Boolean(module.requiresAdmin),
      })),
    );
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-100 p-2 text-neutral-900 dark:bg-neutral-950/50 dark:text-neutral-100 gap-2">
      <AppSidebar
        modules={appModules}
        activePath={activeModule.path}
        user={user}
        onLogout={onLogout}
        onSectionSelect={() => setMenuOpen(true)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex min-h-0 min-w-0 flex-1">
          {menuOpen && activeModule.subRoutes.length > 0 && (
            <SectionMenu
              activeModule={activeModule}
              pathname={pathname}
              canManage={canViewAdmin}
              onClose={() => setMenuOpen(false)}
            />
          )}

          <main className="min-h-0 min-w-0 flex-1 overflow-hidden p-4">
            <Suspense fallback={null}>
              <Routes>
                {allRoutes.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={
                      route.requiresAdmin && !canViewAdmin ? (
                        <NotAvailable />
                      ) : (
                        <route.Component canManage={canViewAdmin} />
                      )
                    }
                  />
                ))}
                <Route path="*" element={<NotAvailable />} />
              </Routes>
            </Suspense>
          </main>
        </div>

        <SectionMenuHighlights />
      </div>
    </div>
  );
}
