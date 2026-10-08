import type { NavigationSection } from '../../dashboard/mockData'
import styles from './ModuleSwitcher.module.css'

interface ModuleSwitcherProps {
  sections: NavigationSection[]
  activeModule: string
  onChange: (moduleId: string) => void
}

function ModuleSwitcher({ sections, activeModule, onChange }: ModuleSwitcherProps) {
  return (
    <div className={styles['module-switcher']} role="group" aria-label="Módulo de gestión">
      {sections.map((section) => {
        const isActive = section.id === activeModule
        const compactLabel = section.id === 'projects' ? 'GP' : 'GE'

        return (
          <button
            key={section.id}
            className={`${styles['module-switcher__button']}${isActive ? ` ${styles['module-switcher__button--active']}` : ''}`}
            type="button"
            aria-label={section.label}
            aria-pressed={isActive}
            title={section.label}
            onClick={() => onChange(section.id)}
          >
            <span className={styles['module-switcher__mark']} aria-hidden="true">
              {compactLabel}
            </span>
            <span className={styles['module-switcher__label']}>{section.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ModuleSwitcher
