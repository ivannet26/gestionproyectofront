import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from './api.js'
import InvitationForm from './InvitationForm.jsx'
import { roleLabel } from './roles.js'

const deliveryLabels = { accepted: 'Envío aceptado', failed: 'Envío fallido', unknown: 'Envío sin confirmar', sending: 'Envío en curso', pending: 'Sin enviar' }

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [requests, setRequests] = useState([])
  const [areas, setAreas] = useState([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const [accountList, requestList, areaList] = await Promise.all([
        apiRequest('admin/accounts/'),
        apiRequest('admin/recovery-requests/'),
        apiRequest('admin/areas/'),
      ])
      setAccounts(accountList)
      setRequests(requestList)
      setAreas(areaList)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { Promise.resolve().then(load) }, [load])

  async function resend(accountId) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await apiRequest(`admin/accounts/${accountId}/resend-invitation/`, { method: 'POST' })
      setMessage(result.detail)
    } catch (failure) {
      setError(failure.message)
    } finally {
      await load()
      setBusy(false)
    }
  }

  async function issueReset(requestId) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await apiRequest(`admin/recovery-requests/${requestId}/issue/`, { method: 'POST' })
      setMessage(result.detail)
      await load()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="dashboard account-page" id="main-content">
      <header className="page-header">
        <div className="page-header__copy">
          <nav className="breadcrumb" aria-label="Ruta de navegación"><ol><li>Administración</li></ol></nav>
          <h1>Cuentas y accesos</h1>
          <p>Registra trabajadores, asigna sus áreas y gestiona el acceso al sistema.</p>
        </div>
      </header>
      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      {message && <p className="form-message" role="status">{message}</p>}
      {loading ? <p role="status">Cargando cuentas…</p> : <div className="account-grid">
        <section className="dashboard-section account-panel" aria-labelledby="invite-title">
          <div className="dashboard-section__header"><div><h2 id="invite-title">Registrar e invitar</h2><p>La cuenta quedará pendiente hasta que se defina la contraseña.</p></div></div>
          <InvitationForm areas={areas} onUpdate={load} onMessage={setMessage} onError={setError} />
        </section>
        <section className="dashboard-section account-panel" aria-labelledby="recovery-title">
          <div className="dashboard-section__header"><div><h2 id="recovery-title">Solicitudes de recuperación</h2><p>Verifica la identidad antes de emitir un enlace.</p></div></div>
          <div className="account-list">
            {requests.length === 0 && <p>No hay solicitudes pendientes.</p>}
            {requests.map((entry) => <div className="account-row" key={entry.id}>
              <div><strong>{entry.name}</strong><small>{entry.email}</small><small>Solicitada: {new Date(entry.requested_at).toLocaleString('es-PE')}</small></div>
              <button type="button" disabled={busy} onClick={() => issueReset(entry.id)}>Verificar y enviar</button>
            </div>)}
          </div>
        </section>
        <section className="dashboard-section account-panel account-panel--wide" aria-labelledby="accounts-title">
          <div className="dashboard-section__header"><div><h2 id="accounts-title">Cuentas</h2><p>Estado y rol global de las cuentas vinculadas.</p></div></div>
          <div className="account-list">
            {accounts.length === 0 && <p>No hay cuentas registradas.</p>}
            {accounts.map((account) => <div className="account-row" key={account.id}>
              <div><strong>{account.name}</strong><small>{account.email}</small><small>{account.all_areas ? 'Todas las áreas activas' : account.areas.map((area) => area.name).join(', ') || 'Sin áreas activas'}</small></div>
              <div className="account-row__meta"><span>{roleLabel(account.role)}</span><span>{account.active ? 'Activa' : 'Pendiente'}</span>{!account.active && <span>{deliveryLabels[account.delivery_status] || 'Sin enviar'}</span>}</div>
              {!account.active && <button type="button" disabled={busy} onClick={() => resend(account.id)}>Reenviar invitación</button>}
            </div>)}
          </div>
        </section>
      </div>}
    </main>
  )
}
