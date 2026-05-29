import type { TicketStatus, TicketPriority } from '@/types'
import styles from './Badge.module.css'

export function StatusBadge({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, string> = {
    'Open': styles.open,
    'In Progress': styles.inProgress,
    'Resolved': styles.resolved,
    'Closed': styles.closed,
  }
  return <span className={`${styles.badge} ${map[status]}`}>{status}</span>
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const map: Record<TicketPriority, string> = {
    'Low': styles.low,
    'Medium': styles.medium,
    'High': styles.high,
    'Critical': styles.critical,
  }
  return <span className={`${styles.badge} ${map[priority]}`}>{priority}</span>
}
