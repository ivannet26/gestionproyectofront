function NavSection({ section }) {
  const itemsId = `${section.id}-navigation`

  return (
    <section className="nav-section" aria-labelledby={`${section.id}-heading`}>
      <p id={`${section.id}-heading`} className="nav-section__label">
        {section.label}
      </p>
      <ul id={itemsId} className="nav-section__items">
        {section.items.map((item) => (
          <li key={item}>
            <a href="#main-content">{item}</a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default NavSection
