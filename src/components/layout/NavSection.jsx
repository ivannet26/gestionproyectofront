import { Link } from 'react-router'

function NavSection({ section, currentPath }) {
  const itemsId = `${section.id}-navigation`

  return (
    <section className="nav-section" aria-labelledby={`${section.id}-heading`}>
      <p id={`${section.id}-heading`} className="nav-section__label">
        {section.label}
      </p>
      <ul id={itemsId} className="nav-section__items">
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
    </section>
  )
}

export default NavSection
