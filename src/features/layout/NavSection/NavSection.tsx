import { Link } from 'react-router'
import type { NavigationSection } from '../../dashboard/mockData'
import styles from './NavSection.module.css'

interface NavSectionProps {
  section: NavigationSection
  currentPath: string
}

function NavSection({ section, currentPath }: NavSectionProps) {
  const itemsId = `${section.id}-navigation`

  return (
    <section className={styles['nav-section']} aria-labelledby={`${section.id}-heading`}>
      <p id={`${section.id}-heading`} className={styles['nav-section__label']}>
        {section.label}
      </p>
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
    </section>
  )
}

export default NavSection
