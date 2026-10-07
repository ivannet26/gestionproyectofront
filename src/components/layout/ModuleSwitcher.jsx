function ModuleSwitcher({ sections, activeModule, onChange }) {
  return (
    <div className="module-switcher" role="group" aria-label="Módulo de gestión">
      {sections.map((section) => {
        const isActive = section.id === activeModule
        const compactLabel = section.id === 'projects' ? 'GP' : 'GE'

        return (
          <button
            key={section.id}
            className={`module-switcher__button${isActive ? ' module-switcher__button--active' : ''}`}
            type="button"
            aria-label={section.label}
            aria-pressed={isActive}
            title={section.label}
            onClick={() => onChange(section.id)}
          >
            <span className="module-switcher__mark" aria-hidden="true">
              {compactLabel}
            </span>
            <span className="module-switcher__label">{section.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ModuleSwitcher
