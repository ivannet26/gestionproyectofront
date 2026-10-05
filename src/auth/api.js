const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

let accessToken = null
let renewal = null
let csrfToken = ''

function csrfCookie() {
  if (csrfToken) return csrfToken
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = payload.detail || Object.values(payload)[0] || 'No se pudo completar la solicitud'
    const failure = new Error(Array.isArray(detail) ? detail.join(' ') : String(detail))
    failure.status = response.status
    failure.payload = payload
    throw failure
  }
  return payload
}

export async function prepareCsrf() {
  const payload = await parseResponse(await fetch(`${apiBase}/api/auth/csrf/`, { credentials: 'include' }))
  csrfToken = payload.csrf_token
}

async function rawRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  return fetch(`${apiBase}/api/auth/${path}`, { ...options, headers, credentials: 'include' })
}

export async function refreshSession() {
  if (!renewal) {
    renewal = (async () => {
      await prepareCsrf()
      const response = await rawRequest('refresh/', { method: 'POST', headers: { 'X-CSRFToken': csrfCookie() } })
      const payload = await parseResponse(response)
      accessToken = payload.access
      return payload.user
    })().finally(() => { renewal = null })
  }
  return renewal
}

export async function login(email, password) {
  await prepareCsrf()
  const response = await rawRequest('login/', {
    method: 'POST',
    headers: { 'X-CSRFToken': csrfCookie() },
    body: JSON.stringify({ email, password }),
  })
  const payload = await parseResponse(response)
  accessToken = payload.access
  return payload.user
}

export async function logout() {
  await prepareCsrf()
  await parseResponse(await rawRequest('logout/', { method: 'POST', headers: { 'X-CSRFToken': csrfCookie() } }))
  accessToken = null
}

export async function apiRequest(path, options = {}, retry = true) {
  let response = await rawRequest(path, options)
  if (response.status === 401 && retry) {
    try {
      await refreshSession()
      response = await rawRequest(path, options)
    } catch {
      accessToken = null
      window.dispatchEvent(new Event('gm-session-expired'))
    }
  }
  return parseResponse(response)
}

export function clearAccess() {
  accessToken = null
}
