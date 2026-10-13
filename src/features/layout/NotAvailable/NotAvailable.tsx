import { Link } from 'react-router'

function NotAvailable() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 p-6" id="main-content">
      <h1 className="m-0 text-xl font-semibold text-neutral-900">Acceso no disponible</h1>
      <p className="mt-2 text-sm text-neutral-600">No tienes permiso para ver esta página o la ruta no existe.</p>
      <Link to="/" className="inline-block mt-4 text-sm font-semibold text-neutral-600">Volver a Inicio</Link>
    </main>
  )
}

export default NotAvailable
