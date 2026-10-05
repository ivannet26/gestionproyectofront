import { useEffect, useState } from 'react'
import './App.css'
import Dashboard from './components/Dashboard.jsx'
import Sidebar from './components/Sidebar.jsx'
import AdminAccountsPage from './auth/AdminAccountsPage.jsx'
import { LoginPage, PasswordPage, RecoveryPage } from './auth/AuthPages.jsx'
import { clearAccess, logout, refreshSession } from './auth/api.js'

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [logoutError, setLogoutError] = useState('')
  const path = window.location.pathname

  useEffect(() => {
    let mounted = true
    refreshSession()
      .then((sessionUser) => { if (mounted) setUser(sessionUser) })
      .catch(() => { if (mounted) clearAccess() })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const expire = () => setUser(null)
    window.addEventListener('gm-session-expired', expire)
    return () => window.removeEventListener('gm-session-expired', expire)
  }, [])

  async function signOut() {
    try {
      await logout()
      setUser(null)
      window.location.assign('/')
    } catch (failure) {
      setLogoutError(failure.message)
    }
  }

  if (path === '/activar' || path === '/restablecer') {
    return <PasswordPage mode={path.slice(1)} />
  }

  if (path === '/recuperar') {
    return <RecoveryPage />
  }

  if (loading) {
    return <main className="auth-page"><p role="status">Comprobando sesión…</p></main>
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />
  }

  return (
    <div
      className={`app-shell${isSidebarCollapsed ? ' app-shell--sidebar-collapsed' : ''}`}
    >
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        user={user}
        onLogout={signOut}
        canViewAdmin={user.permissions.manage_accounts}
        currentPath={path}
      />
      <div className="app-content">
        {logoutError && <p className="form-message form-message--error" role="alert">{logoutError}</p>}
        {path === '/'
          ? <Dashboard />
          : path === '/administracion/cuentas' && user.permissions.manage_accounts
            ? <AdminAccountsPage />
            : <main className="dashboard" id="main-content"><h1>Acceso no disponible</h1><p>No tienes permiso para ver esta página o la ruta no existe.</p><a href="/">Volver a Inicio</a></main>}
      </div>
    </div>
  )
}

export default App
