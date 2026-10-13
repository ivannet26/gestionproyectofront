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
  sessionKey,
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
    const update = (event: Event) => {
      if (event instanceof CustomEvent) setUser(event.detail as SessionUser);
    };
    window.addEventListener("gm-session-expired", expire);
    window.addEventListener("gm-session-updated", update);
    return () => {
      window.removeEventListener("gm-session-expired", expire);
      window.removeEventListener("gm-session-updated", update);
    };
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
            <main className="min-h-screen grid place-items-center bg-neutral-50 text-neutral-900 p-6">
              <p role="status" className="text-sm text-neutral-600">Comprobando sesión…</p>
            </main>
          ) : !user ? (
            <LoginPage onLogin={setUser} />
          ) : (
            <AppShell
              key={sessionKey(user)}
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
