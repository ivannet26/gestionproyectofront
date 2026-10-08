import { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router";
import AppShell from "./features/layout/AppShell/AppShell";
import {
  LoginPage,
  PasswordPage,
  RecoveryPage,
} from "./features/auth/AuthPages/AuthPages";
import type { SessionUser } from "./features/auth/api";
import {
  clearAccess,
  errorText,
  logout,
  refreshSession,
} from "./features/auth/api";

function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutError, setLogoutError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    refreshSession()
      .then((sessionUser) => {
        if (mounted) setUser(sessionUser);
      })
      .catch(() => {
        if (mounted) clearAccess();
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener("gm-session-expired", expire);
    return () => window.removeEventListener("gm-session-expired", expire);
  }, []);

  async function signOut() {
    try {
      await logout();
      setUser(null);
      navigate("/", { replace: true });
    } catch (failure) {
      setLogoutError(errorText(failure));
    }
  }

  return (
    <Routes>
      <Route path="/activar" element={<PasswordPage mode="activar" />} />
      <Route
        path="/restablecer"
        element={<PasswordPage mode="restablecer" />}
      />
      <Route path="/recuperar" element={<RecoveryPage />} />
      <Route
        path="/*"
        element={
          loading ? (
            <main className="auth-page">
              <p role="status">Comprobando sesión…</p>
            </main>
          ) : !user ? (
            <LoginPage onLogin={setUser} />
          ) : (
            <AppShell
              user={user}
              onLogout={signOut}
              logoutError={logoutError}
            />
          )
        }
      />
    </Routes>
  );
}

export default App;
