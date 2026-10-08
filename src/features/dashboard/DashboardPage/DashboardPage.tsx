import type { CSSProperties } from "react";
import {
  kpis,
  portfolioSummary,
  priorityActivities,
  projectProgress,
  projectStatusSummary,
  teamWorkload,
} from "../mockData";
import DashboardSection from "../DashboardSection/DashboardSection";
import styles from "./DashboardPage.module.css";
import KpiCard from "../KpiCard/KpiCard";
import ProgressBar from "../../../shared/ProgressBar/ProgressBar";
import StatusBadge from "../../../shared/StatusBadge/StatusBadge";

function DashboardPage() {
  return (
    <main id="main-content" className="dashboard">
      <header className="page-header">
        <div className="page-header__copy">
          <nav className="breadcrumb" aria-label="Ruta de navegación">
            <ol>
              <li aria-current="page">Inicio</li>
            </ol>
          </nav>
          <h1>Resumen general</h1>
          <p>
            Supervisa el avance de los proyectos y la disponibilidad de los
            equipos desde un solo lugar.
          </p>
        </div>
        <button className="primary-button" type="button">
          <span aria-hidden="true">+</span>
          Nuevo proyecto
        </button>
      </header>

      <section className={styles["kpi-zone"]} aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className={styles["sr-only"]}>
          Indicadores principales
        </h2>
        <div className={styles["kpi-grid"]}>
          {kpis.map((kpi) => (
            <KpiCard key={kpi.id} {...kpi} />
          ))}
        </div>
      </section>

      <DashboardSection
        title="Resumen de proyectos"
        description="Estado y avance del portafolio activo."
        className={styles["project-summary"]}
      >
        <div className={styles["status-summary"]}>
          <div className={styles["subsection-heading"]}>
            <div>
              <h3>Distribución por estado</h3>
              <p>{portfolioSummary.totalProjects} proyectos registrados</p>
            </div>
          </div>

          <div
            className={styles["status-stack"]}
            role="img"
            aria-label="Distribución porcentual de proyectos"
          >
            {projectStatusSummary.map((status) => (
              <span
                key={status.id}
                className={`${styles["status-stack__segment"]} ${styles[`status-stack__segment--${status.tone}`]}`}
                style={
                  { "--segment-size": `${status.percentage}%` } as CSSProperties
                }
                title={`${status.label}: ${status.percentage}%`}
              />
            ))}
          </div>

          <ul className={styles["status-list"]}>
            {projectStatusSummary.map((status) => (
              <li key={status.id}>
                <span
                  className={`${styles["status-list__dot"]} ${styles[`status-list__dot--${status.tone}`]}`}
                  aria-hidden="true"
                />
                <span>{status.label}</span>
                <strong>{status.count}</strong>
                <small>{status.percentage}%</small>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles["project-progress"]}>
          <div className={styles["subsection-heading"]}>
            <div>
              <h3>Avance general</h3>
              <p>Proyectos que requieren seguimiento</p>
            </div>
          </div>
          <div className={styles["project-progress__list"]}>
            {projectProgress.map((project) => (
              <article
                className={styles["project-progress__item"]}
                key={project.id}
              >
                <div className={styles["project-progress__meta"]}>
                  <div>
                    <h4>{project.name}</h4>
                    <span>{project.stage}</span>
                  </div>
                  <strong>{project.progress}%</strong>
                </div>
                <ProgressBar
                  value={project.progress}
                  tone={project.tone}
                  label={`Avance de ${project.name}`}
                />
              </article>
            ))}
          </div>
        </div>
      </DashboardSection>

      <DashboardSection
        title="Seguimiento operativo"
        description="Prioridades inmediatas y carga actual de los equipos."
        className={styles["operations"]}
      >
        <div className={styles["activities-panel"]}>
          <div className={styles["subsection-heading"]}>
            <div>
              <h3>Actividades prioritarias</h3>
              <p>Vencidas o próximas a su fecha límite</p>
            </div>
            <span className={styles["subsection-heading__count"]}>
              {priorityActivities.length} actividades
            </span>
          </div>

          <div className={styles["activities-table-wrap"]}>
            <table className={styles["activities-table"]}>
              <caption className={styles["sr-only"]}>
                Actividades prioritarias o próximas a su fecha límite
              </caption>
              <thead>
                <tr>
                  <th scope="col">Actividad</th>
                  <th scope="col">Proyecto</th>
                  <th scope="col">Responsable</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {priorityActivities.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Actividad">
                      <strong>{item.activity}</strong>
                    </td>
                    <td data-label="Proyecto">{item.project}</td>
                    <td data-label="Responsable">{item.owner}</td>
                    <td data-label="Fecha">{item.dueDate}</td>
                    <td data-label="Estado">
                      <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside
          className={styles["workload-panel"]}
          aria-labelledby="workload-heading"
        >
          <div className={styles["subsection-heading"]}>
            <div>
              <h3 id="workload-heading">Carga por equipo</h3>
              <p>Ocupación estimada de la semana</p>
            </div>
          </div>
          <div className={styles["workload-list"]}>
            {teamWorkload.map((team) => (
              <article className={styles["workload-item"]} key={team.id}>
                <div className={styles["workload-item__meta"]}>
                  <div>
                    <h4>{team.name}</h4>
                    <span>{team.label}</span>
                  </div>
                  <strong>{team.value}%</strong>
                </div>
                <ProgressBar
                  value={team.value}
                  tone={team.tone}
                  label={`Carga de ${team.name}`}
                />
              </article>
            ))}
          </div>
          <p className={styles["workload-panel__note"]}>
            La carga es referencial y utiliza datos simulados.
          </p>
        </aside>
      </DashboardSection>
    </main>
  );
}

export default DashboardPage;
