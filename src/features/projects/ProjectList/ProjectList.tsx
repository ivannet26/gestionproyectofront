import { Link } from "react-router";
import type { ProjectSummary } from "../types";

export interface ProjectListProps {
  projects: ProjectSummary[];
  error: string;
  loading: boolean;
  onCreate: () => void;
  canCreate: boolean;
  creationDisabled: boolean;
}

export default function ProjectList({ projects, error, loading, onCreate, canCreate, creationDisabled }: ProjectListProps) {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 p-6" id="main-content">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="max-w-2xl">
          <nav className="text-xs text-neutral-600" aria-label="Ruta de navegación"><ol className="flex gap-2 m-0 p-0 list-none"><li aria-current="page">G. Proyectos</li></ol></nav>
          <h1 className="m-0 mt-1 text-xl font-semibold text-neutral-900">Proyectos</h1>
          <p className="m-0 mt-1 text-sm text-neutral-600">Proyectos disponibles según tus áreas y participación.</p>
        </div>
        {canCreate && <button className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium shadow-none disabled:opacity-50 disabled:cursor-not-allowed" type="button" disabled={creationDisabled} onClick={onCreate}>+ Crear proyecto</button>}
      </header>
      {error && <p className="border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-none" role="alert">{error}</p>}
      {loading ? <p role="status" className="text-sm text-neutral-600">Cargando proyectos…</p> : (
        <ul className="grid gap-4 m-0 p-0 list-none sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <li className="bg-white border border-neutral-200 shadow-none" key={project.id}>
              <Link to={`/proyectos/${project.id}`} className="grid gap-2.5 h-full p-5 text-neutral-900 no-underline shadow-none">
                <h2 className="m-0 text-base font-semibold text-neutral-900">{project.name}</h2>
                <p className="m-0 text-sm text-neutral-600">{project.areas.map((area) => area.name).join(" · ")}</p>
                <small className="text-xs text-neutral-600">{project.available ? "Disponible por áreas" : "Con participantes asignados"}</small>
              </Link>
            </li>
          ))}
          {projects.length === 0 && !error && <li className="text-sm text-neutral-600">No hay proyectos autorizados disponibles.</li>}
        </ul>
      )}
      {!loading && projects.length >= 200 && <p className="m-0 mt-3 text-xs text-neutral-600">Se muestran los 200 proyectos autorizados más recientes.</p>}
    </main>
  );
}
