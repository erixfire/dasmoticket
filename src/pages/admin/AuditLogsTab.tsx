import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Spinner } from '@/components/ui'
import styles from './AdminTabs.module.css'

interface AuditLog {
  id: number
  action: string
  actor_name: string | null
  actor_role: string | null
  entity_type: string
  entity_id: number | null
  old_value: string | null
  new_value: string | null
  ip_address: string | null
  created_at: string
}

const ACTION_ICON: Record<string, string> = {
  CREATE_TICKET:        '🎫',
  UPDATE_TICKET:        '🔄',
  CREATE_NOTE:          '💬',
  UPDATE_USER_ROLE:     '📦',
  UPDATE_USER_STATUS:   '🚫',
  CREATE_USER:          '👤',
  CREATE_DEPARTMENT:    '🏢',
  UPDATE_DEPARTMENT:    '✏️',
  DELETE_DEPARTMENT:    '🗑️',
  CREATE_SCHEDULE:      '📅',
  UPDATE_SCHEDULE:      '🕒',
}

const ACTION_COLOR: Record<string, string> = {
  CREATE_TICKET:        '#3498db',
  UPDATE_TICKET:        '#f39c12',
  CREATE_NOTE:          '#9b59b6',
  UPDATE_USER_ROLE:     '#e67e22',
  UPDATE_USER_STATUS:   '#e74c3c',
  CREATE_USER:          '#1abc9c',
  CREATE_DEPARTMENT:    '#1abc9c',
  UPDATE_DEPARTMENT:    '#f39c12',
  DELETE_DEPARTMENT:    '#e74c3c',
  CREATE_SCHEDULE:      '#3498db',
  UPDATE_SCHEDULE:      '#f39c12',
}

const ENTITY_LABELS: Record<string, string> = {
  tickets:     'Ticket',
  users:       'User',
  departments: 'Department',
  schedules:   'Schedule',
  notes:       'Note',
}

export default function AuditLogsTab() {
  const [logs, setLogs]             = useState<AuditLog[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.auditLogs.list({ page, limit: 50 })
      setLogs(res.logs)
      setTotal(res.total)
    } catch {
      setLogs([])
    }
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  const actionTypes = ['all', ...Array.from(new Set(logs.map(l => l.action))).sort()]

  const filtered = logs.filter(l => {
    const matchAction = actionFilter === 'all' || l.action === actionFilter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (l.actor_name ?? '').toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.entity_type.toLowerCase().includes(q) ||
      (l.new_value ?? '').toLowerCase().includes(q)
    return matchAction && matchSearch
  })

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60000)    return 'just now'
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div className={styles.tabContent}>
      <div className={styles.toolbar}>
        <div className={styles.searchWell}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Search actor, action, entity..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.selectFilter}
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1) }}
        >
          {actionTypes.map(a => (
            <option key={a} value={a}>
              {a === 'all' ? 'All Actions' : a.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <span className={styles.countBadge}>{total} event{total !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className={styles.center}><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📋</div>
          <p>No audit logs found.</p>
        </div>
      ) : (
        <>
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
                    <p className={styles.auditTarget}>
                      {ENTITY_LABELS[l.entity_type] ?? l.entity_type}
                      {l.entity_id ? ` #${l.entity_id}` : ''}
                      {l.new_value ? ` — ${l.new_value.length > 80 ? l.new_value.slice(0, 80) + '…' : l.new_value}` : ''}
                    </p>
                    <div className={styles.auditMeta}>
                      <span className={styles.auditActor}>{l.actor_name ?? 'System'}</span>
                      {l.actor_role && <span className={styles.auditRole}>{l.actor_role.replace('_', ' ')}</span>}
                      {l.ip_address && <span className={styles.auditIp}>{l.ip_address}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>← Prev</button>
              <span className={styles.pageInfo}>Page {page} of {totalPages} &middot; {total} events</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
