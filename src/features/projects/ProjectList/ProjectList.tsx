import { Link } from "react-router";
import ResourceStatus from "../../../shared/ResourceStatus";
import ListSearch from "../../../shared/ListSearch";
import PageNavigation from "../../../shared/PageNavigation";
import type { useProjectDirectory } from "../useProjectDirectory";

export interface ProjectListProps {
  directory: ReturnType<typeof useProjectDirectory>;
  search: string;
  onSearch: (value: string) => void;
  onCreate: () => void;
  canCreate: boolean;
  creationDisabled: boolean;
}

export default function ProjectList({ directory, search, onSearch, onCreate, canCreate, creationDisabled }: ProjectListProps) {
  return <main className="min-h-full text-neutral-800" id="main-content">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="m-0 text-lg">Proyectos</h1>
        <p className="mt-1 text-sm text-neutral-600">Proyectos disponibles según tus áreas y participación.</p>
      </div>
      {canCreate && <button type="button" disabled={creationDisabled} onClick={onCreate}
        className="cursor-pointer rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-white hover:bg-neutral-700 disabled:opacity-50">+ Crear proyecto</button>}
    </header>
    <ListSearch label="Buscar proyectos" value={search} onSearch={onSearch} />
    <ResourceStatus label="proyectos" {...directory} />
    <PageNavigation label="proyectos" navigation={directory.navigation} />
    <ul aria-busy={directory.pending} className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
      {directory.data.map((project) => <li className="rounded-xl border border-neutral-200 bg-white" key={project.id}>
        <Link to={`/proyectos/${project.id}`} className="grid gap-2.5 rounded-xl p-5 text-neutral-800 no-underline hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-700">
          <h2 className="m-0 text-sm">{project.name}</h2>
          <p className="m-0 text-xs text-neutral-600">{project.areas.map((area) => area.name).join(" · ")}</p>
          <small className="text-xs text-neutral-600">{project.available ? "Disponible por áreas" : "Con participantes asignados"}</small>
        </Link>
      </li>)}
      {directory.ready && !directory.pending && !directory.error && directory.data.length === 0 &&
        <li role="status" className="text-xs text-neutral-600">No hay proyectos para los filtros aplicados. Prueba otra búsqueda.</li>}
    </ul>
  </main>;
}
