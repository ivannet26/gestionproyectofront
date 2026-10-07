import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import gmLogo from "../assets/gm-logo.png";
import { apiRequest, login } from "./api.js";
import { roleLabel } from "./roles.js";

function AuthFrame({ title, intro, children }) {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <img
          className="auth-logo"
          src={gmLogo}
          alt="GM Ingenieros y Consultores"
        />
        <div className="auth-card__heading">
          <p className="auth-eyebrow">Acceso al sistema</p>
          <h1 id="auth-title">{title}</h1>
          <p>{intro}</p>
        </div>
        {children}
      </section>
    </main>
  );
}

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      onLogin(await login(email, password));
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="Iniciar sesión"
      intro="Ingresa con tu correo de trabajador y contraseña."
    >
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="login-email">Correo electrónico</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label htmlFor="login-password">Contraseña</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && (
          <p className="form-message form-message--error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
      <Link className="auth-link" to="/recuperar">
        Solicitar recuperación de acceso
      </Link>
    </AuthFrame>
  );
}

export function RecoveryPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest(
        "recovery-requests/",
        { method: "POST", body: JSON.stringify({ email }) },
        false,
      );
      setMessage(result.detail);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="Recuperar acceso"
      intro="Un administrador revisará tu solicitud antes de enviarte un enlace."
    >
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="recovery-email">Correo electrónico</label>
        <input
          id="recovery-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {error && (
          <p className="form-message form-message--error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="form-message" role="status">
            {message}
          </p>
        )}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Enviando…" : "Solicitar revisión"}
        </button>
      </form>
      <Link className="auth-link" to="/">
        Volver al acceso
      </Link>
    </AuthFrame>
  );
}

export function PasswordPage({ mode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token] = useState(() =>
    new URLSearchParams(location.hash.slice(1)).get("token"),
  );
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const activation = mode === "activar";
  const endpoint = activation ? "activate" : "reset";

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    apiRequest(
      `${endpoint}/preview/`,
      { method: "POST", body: JSON.stringify({ token }) },
      false,
    )
      .then((snapshot) => {
        if (mounted) setDetails(snapshot);
      })
      .catch((failure) => {
        if (mounted) setError(failure.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [endpoint, token]);

  async function submit(event) {
    event.preventDefault();
    if (password.length < 12 || password !== confirmation) {
      setError(
        password.length < 12
          ? "La contraseña debe tener al menos 12 caracteres"
          : "Las contraseñas no coinciden",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = { token, password, password_confirmation: confirmation };
      await apiRequest(
        `${endpoint}/validate-password/`,
        { method: "POST", body: JSON.stringify(payload) },
        false,
      );
      const result = await apiRequest(
        `${endpoint}/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        false,
      );
      setMessage(result.detail);
      setPassword("");
      setConfirmation("");
      navigate(location.pathname, { replace: true });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title={activation ? "Activar cuenta" : "Nueva contraseña"}
      intro="Define una contraseña segura para tu cuenta."
    >
      {!token && (
        <p className="form-message form-message--error" role="alert">
          El enlace no contiene un token válido.
        </p>
      )}
      {loading && <p role="status">Comprobando enlace…</p>}
      {error && (
        <p className="form-message form-message--error" role="alert">
          {error}
        </p>
      )}
      {details && !message && (
        <>
          {activation && (
            <dl className="activation-details">
              <div>
                <dt>Nombres</dt>
                <dd>{details.first_names}</dd>
              </div>
              <div>
                <dt>Apellidos</dt>
                <dd>{details.last_names}</dd>
              </div>
              <div>
                <dt>Correo</dt>
                <dd>{details.email}</dd>
              </div>
              <div>
                <dt>Áreas</dt>
                <dd>
                  {details.all_areas
                    ? "Todas las áreas activas actuales y futuras"
                    : details.areas.map((area) => area.name).join(", ")}
                </dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>{roleLabel(details.role)}</dd>
              </div>
            </dl>
          )}
          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="new-password">Contraseña</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={1024}
              aria-describedby="password-hint"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p className="field-hint" id="password-hint">
              Usa al menos 12 caracteres. Evita contraseñas comunes o parecidas
              a tu nombre o correo.
            </p>
            <label htmlFor="confirm-password">Confirmar contraseña</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={1024}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        </>
      )}
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
      <Link className="auth-link" to="/">
        Ir al acceso
      </Link>
    </AuthFrame>
  );
}
