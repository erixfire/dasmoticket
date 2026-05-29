import styles from './TicketFilters.module.css'

interface Filters {
  status: string
  category: string
  priority: string
  search: string
}

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
  onReset: () => void
}

const STATUSES = ['', 'Open', 'In Progress', 'Resolved', 'Closed']
const CATEGORIES = ['', 'Hardware', 'Software', 'Network', 'Account', 'Other']
const PRIORITIES = ['', 'Low', 'Medium', 'High', 'Critical']

export default function TicketFilters({ filters, onChange, onReset }: Props) {
  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    onChange({ ...filters, [key]: e.target.value })

  const hasFilters = filters.status || filters.category || filters.priority || filters.search

  return (
    <div className={styles.bar}>
      <input
        type="search"
        placeholder="🔍 Search ticket # or title..."
        value={filters.search}
        onChange={set('search')}
        className={styles.search}
      />
      <select value={filters.status} onChange={set('status')} className={styles.select}>
        <option value="">All Statuses</option>
        {STATUSES.filter(Boolean).map(s => <option key={s}>{s}</option>)}
      </select>
      <select value={filters.category} onChange={set('category')} className={styles.select}>
        <option value="">All Categories</option>
        {CATEGORIES.filter(Boolean).map(c => <option key={c}>{c}</option>)}
      </select>
      <select value={filters.priority} onChange={set('priority')} className={styles.select}>
        <option value="">All Priorities</option>
        {PRIORITIES.filter(Boolean).map(p => <option key={p}>{p}</option>)}
      </select>
      {hasFilters && (
        <button onClick={onReset} className={styles.resetBtn}>Clear</button>
      )}
    </div>
  )
}
