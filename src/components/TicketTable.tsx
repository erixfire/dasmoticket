import type { Ticket } from '@/types'
import { StatusBadge, PriorityBadge } from './StatusBadge'
import styles from './TicketTable.module.css'

interface Props {
  tickets: Ticket[]
  onSelect: (ticket: Ticket) => void
  loading?: boolean
}

export default function TicketTable({ tickets, onSelect, loading }: Props) {
  if (loading) {
    return <div className={styles.empty}><span className={styles.spinner} /> Loading tickets...</div>
  }
  if (!tickets.length) {
    return <div className={styles.empty}>🎫 No tickets found. Try adjusting your filters.</div>
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ticket #</th>
            <th>Title</th>
            <th>Category</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Requester</th>
            <th>Assigned To</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(t => (
            <tr key={t.id} onClick={() => onSelect(t)} className={styles.row}>
              <td><code className={styles.ticketNum}>{t.ticket_number}</code></td>
              <td className={styles.titleCell}>{t.title}</td>
              <td><span className={styles.category}>{t.category}</span></td>
              <td><PriorityBadge priority={t.priority} /></td>
              <td><StatusBadge status={t.status} /></td>
              <td>{t.requester_name ?? '—'}</td>
              <td>{t.assigned_name ?? <span className={styles.unassigned}>Unassigned</span>}</td>
              <td className={styles.date}>{new Date(t.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
