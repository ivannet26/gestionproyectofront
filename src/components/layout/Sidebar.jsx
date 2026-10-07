import { useState } from "react";
import { Link } from "react-router";
import gmLogo from "../../assets/gm-logo.png";
import { administrationItem, navigationSections } from "../../data/mockData.js";
import ModuleSwitcher from "./ModuleSwitcher.jsx";
import NavSection from "./NavSection.jsx";
import { roleLabel } from "../../auth/roles.js";

function Sidebar({
  canViewAdmin = false,
  isCollapsed,
  onToggleCollapse,
  user,
  onLogout,
  currentPath,
}) {
  const [activeModule, setActiveModule] = useState(navigationSections[0].id);
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const activeSection = navigationSections.find(
    (section) => section.id === activeModule,
  );

  return (
    <aside className={`sidebar${isCollapsed ? " sidebar--collapsed" : ""}`}>
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
          aria-label={
            isCollapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"
          }
          aria-expanded={!isCollapsed}
          aria-controls="sidebar-navigation"
          title={isCollapsed ? "Mostrar menú" : "Ocultar menú"}
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
        <Link
          className={`sidebar__home${currentPath === "/" ? "" : " sidebar__home--inactive"}`}
          to="/"
          aria-label="Inicio"
          aria-current={currentPath === "/" ? "page" : undefined}
          title="Inicio"
        >
          <span className="sidebar__nav-mark" aria-hidden="true">
            IN
          </span>
          <span className="sidebar__nav-label">Inicio</span>
        </Link>

        <div className="sidebar__module-area">
          <p className="sidebar__label">Módulos</p>
          <ModuleSwitcher
            sections={navigationSections}
            activeModule={activeModule}
            onChange={setActiveModule}
          />

          <div className="sidebar__section-slot">
            <NavSection section={activeSection} currentPath={pathname} />
          </div>

          {canViewAdmin && administrationItem.requiresAuthorization && (
            <Link
              className="sidebar__admin"
              to="/administracion/cuentas"
              aria-current={
                currentPath === "/administracion/cuentas" ? "page" : undefined
              }
            >
              {administrationItem.label}
            </Link>
          )}
        </div>
      </nav>

      <div
        className="sidebar__profile"
        role="group"
        aria-label={`${user.name}, ${roleLabel(user.role)}`}
        title={`${user.name} · ${roleLabel(user.role)}`}
      >
        <span className="sidebar__avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="sidebar__profile-copy">
          <strong>{user.name}</strong>
          <small>{roleLabel(user.role)}</small>
        </span>
        <button
          className="sidebar__logout"
          type="button"
          onClick={onLogout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          Salir
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
