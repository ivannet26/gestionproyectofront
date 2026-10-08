import { useState } from "react";
import { Route, Routes, useLocation } from "react-router";
import type { SessionUser } from "../../auth/api";
import { appRoutes } from "../../../routes";
import NotAvailable from "../NotAvailable/NotAvailable";
import Sidebar from "../Sidebar/Sidebar";
import styles from "./AppShell.module.css";

interface AppShellProps {
  user: SessionUser;
  onLogout: () => void;
  logoutError: string;
}

function AppShell({ user, onLogout, logoutError }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { pathname } = useLocation();
  const canViewAdmin = user.permissions.manage_accounts;

  return (
    <div
      className={`${styles["app-shell"]}${isSidebarCollapsed ? " sidebar--collapsed" : ""}`}
    >
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        user={user}
        onLogout={onLogout}
        canViewAdmin={canViewAdmin}
        currentPath={pathname}
      />
      <div className={styles["app-content"]}>
        {logoutError && (
          <p className="form-message form-message--error" role="alert">
            {logoutError}
          </p>
        )}
        <Routes>
          {appRoutes.map(({ path, Component, requiresAdmin }) => (
            <Route
              key={path}
              path={path}
              element={
                requiresAdmin && !canViewAdmin ? (
                  <NotAvailable />
                ) : (
                  <Component />
                )
              }
            />
          ))}
          <Route path="*" element={<NotAvailable />} />
        </Routes>
      </div>
    </div>
  );
}

export default AppShell;
