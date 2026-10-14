import { useCallback, useEffect, useState } from "react";
import type { Account, Area, RecoveryRequest } from "../api";
import { apiRequest, errorText } from "../api";
import InvitationForm from "../InvitationForm/InvitationForm";
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
    <main className="min-h-screen  text-neutral-900 p-6" id="main-content">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="max-w-2xl">
          <nav
            className="text-xs text-neutral-600"
            aria-label="Ruta de navegación"
          >
            <ol className="flex gap-2 m-0 p-0 list-none">
              <li>Administración</li>
            </ol>
          </nav>
          <h1 className="m-0 mt-1 text-xl text-neutral-900">
            Cuentas y accesos
          </h1>
          <p className="m-0 mt-1 text-sm text-neutral-600">
            Registra trabajadores, asigna sus áreas y gestiona el acceso al
            sistema.
          </p>
        </div>
      </header>
      {error && (
        <p
          className="border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-none"
          role="alert"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          className="border border-neutral-200  px-3 py-2 text-sm text-neutral-900 shadow-none"
          role="status"
        >
          {message}
        </p>
      )}
      {loading ? (
        <p role="status" className="text-sm text-neutral-600">
          Cargando cuentas…
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section
            className="bg-white border border-neutral-200 shadow-none"
            aria-labelledby="invite-title"
          >
            <div className="px-5 pt-5 pb-0">
              <div>
                <h2
                  id="invite-title"
                  className="m-0 text-base text-neutral-900"
                >
                  Registrar e invitar
                </h2>
                <p className="m-0 mt-1 text-sm text-neutral-600">
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
            className="bg-white border border-neutral-200 shadow-none"
            aria-labelledby="recovery-title"
          >
            <div className="px-5 pt-5 pb-0">
              <div>
                <h2
                  id="recovery-title"
                  className="m-0 text-base text-neutral-900"
                >
                  Solicitudes de recuperación
                </h2>
                <p className="m-0 mt-1 text-sm text-neutral-600">
                  Verifica la identidad antes de emitir un enlace.
                </p>
              </div>
            </div>
            <div className="px-5 py-4">
              {requests.length === 0 && (
                <p className="text-sm text-neutral-600">
                  No hay solicitudes pendientes.
                </p>
              )}
              {requests.map((entry) => (
                <div
                  className="flex items-center justify-between gap-4 py-3 border-b border-neutral-200 last:border-b-0"
                  key={entry.id}
                >
                  <div className="min-w-0">
                    <strong className="block text-sm text-neutral-900">
                      {entry.name}
                    </strong>
                    <small className="block mt-0.5 text-xs text-neutral-600">
                      {entry.email}
                    </small>
                    <small className="block mt-0.5 text-xs text-neutral-600">
                      Solicitada:{" "}
                      {new Date(entry.requested_at).toLocaleString("es-PE")}
                    </small>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => issueReset(entry.id)}
                    className="px-3 py-2 text-neutral-900 bg-neutral-50 border border-neutral-200 text-sm whitespace-nowrap cursor-pointer shadow-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Verificar y enviar
                  </button>
                </div>
              ))}
            </div>
          </section>
          <section
            className="bg-white border border-neutral-200 shadow-none lg:col-span-2"
            aria-labelledby="accounts-title"
          >
            <div className="px-5 pt-5 pb-0">
              <div>
                <h2
                  id="accounts-title"
                  className="m-0 text-base text-neutral-900"
                >
                  Cuentas
                </h2>
                <p className="m-0 mt-1 text-sm text-neutral-600">
                  Estado y rol global de las cuentas vinculadas.
                </p>
              </div>
            </div>
            <div className="px-5 py-4">
              {accounts.length === 0 && (
                <p className="text-sm text-neutral-600">
                  No hay cuentas registradas.
                </p>
              )}
              {accounts.map((account) => (
                <div
                  className="flex items-center justify-between gap-4 py-3 border-b border-neutral-200 last:border-b-0 max-sm:flex-col max-sm:items-start"
                  key={account.id}
                >
                  <div className="min-w-0">
                    <strong className="block text-sm text-neutral-900">
                      {account.name}
                    </strong>
                    <small className="block mt-0.5 text-xs text-neutral-600">
                      {account.email}
                    </small>
                    <small className="block mt-0.5 text-xs text-neutral-600">
                      {account.all_areas
                        ? "Todas las áreas activas"
                        : account.areas.map((area) => area.name).join(", ") ||
                          "Sin áreas activas"}
                    </small>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-neutral-600">
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
                      className="px-3 py-2 text-neutral-900 bg-neutral-50 border border-neutral-200 text-sm whitespace-nowrap cursor-pointer shadow-none disabled:opacity-60 disabled:cursor-not-allowed"
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
