import styles from './Badge.module.css'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
export type BadgeSize = 'sm' | 'xs'

export interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  dot?: boolean
  size?: BadgeSize
}

export function Badge({ children, variant = 'default', dot = false, size }: BadgeProps) {
  return (
    <span className={[
      styles.badge,
      styles[variant],
      size ? styles[size] : '',
    ].filter(Boolean).join(' ')}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, BadgeVariant> = {
    Critical: 'danger',
    High: 'warning',
    Medium: 'info',
    Low: 'default',
  }
  return <Badge variant={map[priority] ?? 'default'}>{priority}</Badge>
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    Open: 'info',
    'In Progress': 'warning',
    Resolved: 'success',
    Closed: 'default',
    Cancelled: 'danger',
    Pending: 'default',
    Confirmed: 'success',
    Completed: 'purple',
  }
  return <Badge variant={map[status] ?? 'default'} dot>{status}</Badge>
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, BadgeVariant> = {
    admin: 'purple',
    it_staff: 'info',
    employee: 'default',
  }
  return <Badge variant={map[role] ?? 'default'}>{role.replace('_', ' ')}</Badge>
}
