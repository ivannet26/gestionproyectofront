import { useState } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { appRoutes } from '../../routes.jsx'
import NotAvailable from './NotAvailable.jsx'
import Sidebar from './Sidebar.jsx'

function AppShell({ user, onLogout, logoutError }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { pathname } = useLocation()
  const canViewAdmin = user.permissions.manage_accounts

  return (
    <div
      className={`app-shell${isSidebarCollapsed ? ' app-shell--sidebar-collapsed' : ''}`}
    >
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        user={user}
        onLogout={onLogout}
        canViewAdmin={canViewAdmin}
        currentPath={pathname}
      />
      <div className="app-content">
        {logoutError && <p className="form-message form-message--error" role="alert">{logoutError}</p>}
        <Routes>
          {appRoutes.map(({ path, Component, requiresAdmin }) => (
            <Route
              key={path}
              path={path}
              element={
                requiresAdmin && !canViewAdmin ? <NotAvailable /> : <Component />
              }
            />
          ))}
          <Route path="*" element={<NotAvailable />} />
        </Routes>
      </div>
    </div>
  )
}

export default AppShell
