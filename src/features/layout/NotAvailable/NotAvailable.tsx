import { Link } from 'react-router'

function NotAvailable() {
  return (
    <main className="dashboard" id="main-content">
      <h1>Acceso no disponible</h1>
      <p>No tienes permiso para ver esta página o la ruta no existe.</p>
      <Link to="/">Volver a Inicio</Link>
    </main>
  )
}

export default NotAvailable
