import { Link } from "react-router";
import type { ProjectSummary } from "../types";
import styles from "./ProjectList.module.css";

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
    <main className="dashboard" id="main-content">
      <header className="page-header">
        <div className="page-header__copy">
          <nav className="breadcrumb" aria-label="Ruta de navegación"><ol><li aria-current="page">G. Proyectos</li></ol></nav>
          <h1>Proyectos</h1>
          <p>Proyectos disponibles según tus áreas y participación.</p>
        </div>
        {canCreate && <button className="primary-button" type="button" disabled={creationDisabled} onClick={onCreate}>+ Crear proyecto</button>}
      </header>
      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      {loading ? <p role="status">Cargando proyectos…</p> : (
        <ul className={styles.cards}>
          {projects.map((project) => (
            <li className="dashboard-section" key={project.id}>
              <Link to={`/proyectos/${project.id}`}>
                <h2>{project.name}</h2>
                <p>{project.areas.map((area) => area.name).join(" · ")}</p>
                <small>{project.available ? "Disponible por áreas" : "Con participantes asignados"}</small>
              </Link>
            </li>
          ))}
          {projects.length === 0 && !error && <li>No hay proyectos autorizados disponibles.</li>}
        </ul>
      )}
      {!loading && projects.length >= 200 && <p className="field-hint">Se muestran los 200 proyectos autorizados más recientes.</p>}
    </main>
  );
}
