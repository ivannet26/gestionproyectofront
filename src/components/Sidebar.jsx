import { useState } from 'react'
import gmLogo from '../assets/gm-logo.png'
import {
  administrationItem,
  currentUser,
  navigationSections,
} from '../data/mockData.js'
import ModuleSwitcher from './ModuleSwitcher.jsx'
import NavSection from './NavSection.jsx'

function Sidebar({ canViewAdmin = false, isCollapsed, onToggleCollapse }) {
  const [activeModule, setActiveModule] = useState(navigationSections[0].id)
  const activeSection = navigationSections.find(
    (section) => section.id === activeModule,
  )

  return (
    <aside className={`sidebar${isCollapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <span className="sidebar__logo-frame">
          <img
            className="sidebar__logo"
            src={gmLogo}
            alt="GM Ingenieros y Consultores"
          />
        </span>
        <button
          className="sidebar__collapse-button"
          type="button"
          aria-label={isCollapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral'}
          aria-expanded={!isCollapsed}
          aria-controls="sidebar-navigation"
          title={isCollapsed ? 'Mostrar menú' : 'Ocultar menú'}
          onClick={onToggleCollapse}
        >
          <span className="sidebar__collapse-chevron" aria-hidden="true" />
        </button>
      </div>

      <nav
        id="sidebar-navigation"
        className="sidebar__nav"
        aria-label="Navegación principal"
      >
        <a
          className="sidebar__home"
          href="#main-content"
          aria-label="Inicio"
          aria-current="page"
          title="Inicio"
        >
          <span className="sidebar__nav-mark" aria-hidden="true">
            IN
          </span>
          <span className="sidebar__nav-label">Inicio</span>
        </a>

        <div className="sidebar__module-area">
          <p className="sidebar__label">Módulos</p>
          <ModuleSwitcher
            sections={navigationSections}
            activeModule={activeModule}
            onChange={setActiveModule}
          />

          <div className="sidebar__section-slot">
            <NavSection section={activeSection} />
          </div>

          {canViewAdmin && administrationItem.requiresAuthorization && (
            <a className="sidebar__admin" href="#main-content">
              {administrationItem.label}
            </a>
          )}
        </div>
      </nav>

      <div
        className="sidebar__profile"
        role="group"
        aria-label={`${currentUser.name}, ${currentUser.role}`}
        title={`${currentUser.name} · ${currentUser.role}`}
      >
        <span className="sidebar__avatar" aria-hidden="true">
          {currentUser.initials}
        </span>
        <span className="sidebar__profile-copy">
          <strong>{currentUser.name}</strong>
          <small>{currentUser.role}</small>
        </span>
      </div>
    </aside>
  )
}

export default Sidebar
