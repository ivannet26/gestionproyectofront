import { useCallback, useEffect, useState } from "react";
import type { Account, Area, RecoveryRequest } from "../api";
import { apiRequest, errorText } from "../api";
import InvitationForm from "../InvitationForm/InvitationForm";
import styles from "./AdminAccountsPage.module.css";
import { roleLabel } from "../roles";

interface DetailResult {
  detail: string;
}

const deliveryLabels: Record<string, string> = {
  accepted: "Envío aceptado",
  failed: "Envío fallido",
  unknown: "Envío sin confirmar",
  sending: "Envío en curso",
  pending: "Sin enviar",
};

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [accountList, requestList, areaList] = await Promise.all([
        apiRequest<Account[]>("admin/accounts/"),
        apiRequest<RecoveryRequest[]>("admin/recovery-requests/"),
        apiRequest<Area[]>("admin/areas/"),
      ]);
      setAccounts(accountList);
      setRequests(requestList);
      setAreas(areaList);
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function resend(accountId: number) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest<DetailResult>(
        `admin/accounts/${accountId}/resend-invitation/`,
        { method: "POST" },
      );
      setMessage(result.detail);
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      await load();
      setBusy(false);
    }
  }

  async function issueReset(requestId: number) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest<DetailResult>(
        `admin/recovery-requests/${requestId}/issue/`,
        { method: "POST" },
      );
      setMessage(result.detail);
      await load();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`dashboard ${styles["account-page"]}`} id="main-content">
      <header className="page-header">
        <div className="page-header__copy">
          <nav className="breadcrumb" aria-label="Ruta de navegación">
            <ol>
              <li>Administración</li>
            </ol>
          </nav>
          <h1>Cuentas y accesos</h1>
          <p>
            Registra trabajadores, asigna sus áreas y gestiona el acceso al
            sistema.
          </p>
        </div>
      </header>
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
      {loading ? (
        <p role="status">Cargando cuentas…</p>
      ) : (
        <div className={styles["account-grid"]}>
          <section
            className={`dashboard-section ${styles["account-panel"]}`}
            aria-labelledby="invite-title"
          >
            <div className="dashboard-section__header">
              <div>
                <h2 id="invite-title">Registrar e invitar</h2>
                <p>
                  La cuenta quedará pendiente hasta que se defina la contraseña.
                </p>
              </div>
            </div>
            <InvitationForm
              areas={areas}
              onUpdate={load}
              onMessage={setMessage}
              onError={setError}
            />
          </section>
          <section
            className={`dashboard-section ${styles["account-panel"]}`}
            aria-labelledby="recovery-title"
          >
            <div className="dashboard-section__header">
              <div>
                <h2 id="recovery-title">Solicitudes de recuperación</h2>
                <p>Verifica la identidad antes de emitir un enlace.</p>
              </div>
            </div>
            <div className={styles["account-list"]}>
              {requests.length === 0 && <p>No hay solicitudes pendientes.</p>}
              {requests.map((entry) => (
                <div className={styles["account-row"]} key={entry.id}>
                  <div>
                    <strong>{entry.name}</strong>
                    <small>{entry.email}</small>
                    <small>
                      Solicitada:{" "}
                      {new Date(entry.requested_at).toLocaleString("es-PE")}
                    </small>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => issueReset(entry.id)}
                  >
                    Verificar y enviar
                  </button>
                </div>
              ))}
            </div>
          </section>
          <section
            className={`dashboard-section ${styles["account-panel"]} ${styles["account-panel--wide"]}`}
            aria-labelledby="accounts-title"
          >
            <div className="dashboard-section__header">
              <div>
                <h2 id="accounts-title">Cuentas</h2>
                <p>Estado y rol global de las cuentas vinculadas.</p>
              </div>
            </div>
            <div className={styles["account-list"]}>
              {accounts.length === 0 && <p>No hay cuentas registradas.</p>}
              {accounts.map((account) => (
                <div className={styles["account-row"]} key={account.id}>
                  <div>
                    <strong>{account.name}</strong>
                    <small>{account.email}</small>
                    <small>
                      {account.all_areas
                        ? "Todas las áreas activas"
                        : account.areas.map((area) => area.name).join(", ") ||
                          "Sin áreas activas"}
                    </small>
                  </div>
                  <div className={styles["account-row__meta"]}>
                    <span>{roleLabel(account.role)}</span>
                    <span>{account.active ? "Activa" : "Pendiente"}</span>
                    {!account.active && (
                      <span>
                        {deliveryLabels[account.delivery_status] ||
                          "Sin enviar"}
                      </span>
                    )}
                  </div>
                  {!account.active && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => resend(account.id)}
                    >
                      Reenviar invitación
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
