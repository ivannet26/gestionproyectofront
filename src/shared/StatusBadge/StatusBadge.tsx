import type { ReactNode } from 'react'
import styles from './StatusBadge.module.css'

interface StatusBadgeProps {
  children: ReactNode
  tone?: string
}

function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`${styles["status-badge"]} ${styles[`status-badge--${tone}`]}`}>{children}</span>
}

export default StatusBadge
