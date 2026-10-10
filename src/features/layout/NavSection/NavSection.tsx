import { Link } from 'react-router'
import type { NavigationSection } from '../../dashboard/mockData'
import type { ProjectSummary } from '../../projects/types'
import ProjectNavigation from '../../projects/ProjectNavigation/ProjectNavigation'
import styles from './NavSection.module.css'

interface NavSectionProps {
  section: NavigationSection
  currentPath: string
  projects: ProjectSummary[]
  canCreateProject: boolean
  projectCreationDisabled: boolean
  onCreateProject: () => void
  projectsLoading: boolean
  projectError: string
  canCreateTasks: boolean
  onCreateTask: (projectId: number) => void
}

function NavSection({
  section, currentPath, projects, canCreateProject, projectCreationDisabled, onCreateProject,
  projectsLoading, projectError, canCreateTasks, onCreateTask,
}: NavSectionProps) {
  const itemsId = `${section.id}-navigation`

  return (
    <section className={styles['nav-section']} aria-labelledby={`${section.id}-heading`}>
      <div className={styles.heading}>
        <p id={`${section.id}-heading`} className={styles['nav-section__label']}>{section.label}</p>
        {section.id === 'projects' && canCreateProject && (
          <button className={styles.create} type="button" aria-label="Crear proyecto"
            disabled={projectCreationDisabled}
            title={projectCreationDisabled ? 'Crear proyecto: esperando servicio y catálogos' : 'Crear proyecto'}
            onClick={onCreateProject}>+</button>
        )}
      </div>
      <ul id={itemsId} className={styles['nav-section__items']}>
        {section.items.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              aria-current={currentPath === item.path ? 'page' : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      {section.id === 'projects' && <ProjectNavigation projects={projects} currentPath={currentPath}
        loading={projectsLoading} error={projectError} canCreateTasks={canCreateTasks} onCreateTask={onCreateTask} />}
    </section>
  )
}

export default NavSection
