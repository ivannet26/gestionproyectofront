import { Link } from "react-router";
import type { ProjectSummary } from "../types";
import { useProjects } from "../useProjects";

export interface ProjectListProps {
  projects?: ProjectSummary[];
  error?: string;
  loading?: boolean;
  onCreate?: () => void;
  canCreate?: boolean;
  creationDisabled?: boolean;
}

export default function ProjectList({
  projects: propProjects,
  error: propError,
  loading: propLoading = false,
  onCreate,
  canCreate = false,
  creationDisabled = false,
}: ProjectListProps) {
  const { projects: hookProjects } = useProjects();
  const projects = propProjects ?? hookProjects;
  const error = propError ?? "";
  const loading = propLoading;

  return (
    <main className="min-h-full text-neutral-900 dark:text-neutral-100 p-6" id="main-content">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="max-w-2xl">
          <nav
            className="text-xs text-neutral-600 dark:text-neutral-400"
            aria-label="Ruta de navegación"
          >
            <ol className="flex gap-2 m-0 p-0 list-none">
              <li aria-current="page">G. Proyectos</li>
            </ol>
          </nav>
          <h1 className="m-0 mt-1 text-xl text-neutral-900 dark:text-neutral-100">Proyectos</h1>
          <p className="m-0 mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Proyectos disponibles según tus áreas y participación.
          </p>
        </div>
        {canCreate && onCreate && (
          <button
            className="px-4 py-2 bg-neutral-900 text-white text-sm shadow-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            type="button"
            disabled={creationDisabled}
            onClick={onCreate}
          >
            + Crear proyecto
          </button>
        )}
      </header>
      {error && (
        <p
          className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
          role="alert"
        >
          {error}
        </p>
      )}
      {loading ? null : (
        <ul className="grid gap-4 m-0 p-0 list-none sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <li
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
              key={project.id}
            >
              <Link
                to={`/proyectos/${project.id}`}
                className="grid gap-2.5 h-full p-5 text-neutral-900 dark:text-neutral-100 no-underline"
              >
                <h2 className="m-0 text-base text-neutral-900 dark:text-neutral-100">
                  {project.name}
                </h2>
                <p className="m-0 text-sm text-neutral-600 dark:text-neutral-400">
                  {project.areas.map((area) => area.name).join(" · ")}
                </p>
                <small className="text-xs text-neutral-600 dark:text-neutral-400">
                  {project.available
                    ? "Disponible por áreas"
                    : "Con participantes asignados"}
                </small>
              </Link>
            </li>
          ))}
          {projects.length === 0 && !error && (
            <li className="text-sm text-neutral-600 dark:text-neutral-400">
              No hay proyectos autorizados disponibles.
            </li>
          )}
        </ul>
      )}
      {!loading && projects.length >= 200 && (
        <p className="m-0 mt-3 text-xs text-neutral-600 dark:text-neutral-400">
          Se muestran los 200 proyectos autorizados más recientes.
        </p>
      )}
    </main>
  );
}
