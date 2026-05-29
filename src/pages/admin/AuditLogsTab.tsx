import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Spinner } from '@/components/ui'
import styles from './AdminTabs.module.css'

type ActionType = string

interface AuditEntry {
  id: number
  action: ActionType
  actor_name: string
  actor_role: string
  target: string
  detail?: string
  ip?: string
  created_at: string
}

const ACTION_ICON: Record<string, string> = {
  ticket_created:     '🎫',
  ticket_updated:     '🔄',
  ticket_assigned:    '📌',
  ticket_resolved:    '✅',
  ticket_closed:      '🔒',
  user_role_changed:  '📦',
  user_deactivated:   '🚫',
  department_created: '🏢',
  department_deleted: '🗑️',
}

const ACTION_COLOR: Record<string, string> = {
  ticket_created:     '#3498db',
  ticket_updated:     '#f39c12',
  ticket_assigned:    '#9b59b6',
  ticket_resolved:    '#2ecc71',
  ticket_closed:      '#95a5a6',
  user_role_changed:  '#e67e22',
  user_deactivated:   '#e74c3c',
  department_created: '#1abc9c',
  department_deleted: '#e74c3c',
}

// Derives audit-style log entries from ticket data (fallback until /audit API exists)
async function fetchAuditEntries(): Promise<AuditEntry[]> {
  const r = await api.tickets.list({ page: '1' })
  const tickets = r.data.tickets
  const entries: AuditEntry[] = []

  tickets.slice(0, 30).forEach((t, i) => {
    entries.push({
      id: i * 3 + 1,
      action: 'ticket_created',
      actor_name: t.requester_name ?? 'Employee',
      actor_role: 'employee',
      target: `#${t.ticket_number} ${t.title}`,
      created_at: t.created_at,
    })
    if (t.assigned_to) {
      entries.push({
        id: i * 3 + 2,
        action: 'ticket_assigned',
        actor_name: 'System',
        actor_role: 'it_staff',
        target: `#${t.ticket_number} assigned to ${t.assigned_name ?? 'staff'}`,
        created_at: t.updated_at,
      })
    }
    if (t.status === 'Resolved' || t.status === 'Closed') {
      entries.push({
        id: i * 3 + 3,
        action: t.status === 'Resolved' ? 'ticket_resolved' : 'ticket_closed',
        actor_name: t.assigned_name ?? 'IT Staff',
        actor_role: 'it_staff',
        target: `#${t.ticket_number} ${t.title}`,
        created_at: t.resolved_at ?? t.updated_at,
      })
    }
  })

  return entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export default function AuditLogsTab() {
  const [logs, setLogs]         = useState<AuditEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAuditEntries()
      setLogs(data)
    } catch {
      setLogs([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const actionTypes = ['all', ...Array.from(new Set(logs.map(l => l.action)))]

  const filtered = logs.filter(l => {
    const matchAction = actionFilter === 'all' || l.action === actionFilter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      l.actor_name.toLowerCase().includes(q) ||
      l.target.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q)
    return matchAction && matchSearch
  })

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60000)    return 'just now'
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.toolbar}>
        <div className={styles.searchWell}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Search logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.selectFilter}
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
        >
          {actionTypes.map(a => (
            <option key={a} value={a}>{a === 'all' ? 'All Actions' : a.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <span className={styles.countBadge}>{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className={styles.center}><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📋</div>
          <p>No audit logs found.</p>
        </div>
      ) : (
        <div className={styles.auditCard}>
          <ul className={styles.auditList}>
            {filtered.map((l, idx) => (
              <li key={l.id} className={styles.auditItem}>
                <div className={styles.auditLine}>
                  <div
                    className={styles.auditDot}
                    style={{
                      background: ACTION_COLOR[l.action] ?? '#95a5a6',
                      boxShadow: `0 0 6px ${ACTION_COLOR[l.action] ?? '#95a5a6'}88`,
                    }}
                  />
                  {idx < filtered.length - 1 && <div className={styles.auditConnector} />}
                </div>
                <div className={styles.auditBody}>
                  <div className={styles.auditTop}>
                    <span className={styles.auditIcon}>{ACTION_ICON[l.action] ?? '📤'}</span>
                    <span
                      className={styles.auditAction}
                      style={{ color: ACTION_COLOR[l.action] ?? '#95a5a6' }}
                    >
                      {l.action.replace(/_/g, ' ')}
                    </span>
                    <span className={styles.auditTime}>{relTime(l.created_at)}</span>
                  </div>
                  <p className={styles.auditTarget}>{l.target}</p>
                  <div className={styles.auditMeta}>
                    <span className={styles.auditActor}>{l.actor_name}</span>
                    <span className={styles.auditRole}>{l.actor_role.replace('_', ' ')}</span>
                    {l.ip && <span className={styles.auditIp}>{l.ip}</span>}
                    {l.detail && <span className={styles.auditDetail}>{l.detail}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
