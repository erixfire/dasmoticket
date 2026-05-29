import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '@/lib/adminApi'
import type { AuditLog } from '@/types'
import styles from './AdminTab.module.css'

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  CREATE: { bg: '#dcfce7', color: '#15803d' },
  UPDATE: { bg: '#dbeafe', color: '#1d4ed8' },
  DELETE: { bg: '#fee2e2', color: '#dc2626' },
  DEACTIVATE: { bg: '#fef9c3', color: '#a16207' },
  LOGIN: { bg: '#f3e8ff', color: '#7c3aed' },
  SUBMIT: { bg: '#e0f2fe', color: '#0369a1' },
}

function actionColor(action: string) {
  for (const key of Object.keys(ACTION_COLORS)) {
    if (action.includes(key)) return ACTION_COLORS[key]
  }
  return { bg: '#f3f4f6', color: '#374151' }
}

export default function AuditLogsTab() {
  const [logs, setLogs]           = useState<AuditLog[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [loading, setLoading]     = useState(false)
  const [expanded, setExpanded]   = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page) }
      if (filterAction) params.action = filterAction
      if (filterEntity) params.entity_type = filterEntity
      const res = await adminApi.auditLogs.list(params)
      setLogs(res.logs); setTotal(res.total)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [page, filterAction, filterEntity])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 30)

  return (
    <div>
      <div className={styles.toolbar}>
        <span className={styles.count}>{total} log entries</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className={styles.filterInput}
            placeholder="Filter by action..."
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setPage(1) }}
          />
          <select
            className={styles.filterSelect}
            value={filterEntity}
            onChange={e => { setFilterEntity(e.target.value); setPage(1) }}
          >
            <option value="">All entities</option>
            <option value="users">users</option>
            <option value="tickets">tickets</option>
            <option value="schedules">schedules</option>
            <option value="surveys">surveys</option>
            <option value="departments">departments</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>ID</th><th>IP</th><th></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className={styles.loading}>Loading...</td></tr>}
            {!loading && logs.map(log => (
              <>
                <tr key={log.id} className={expanded === log.id ? styles.rowExpanded : ''}>
                  <td className={styles.mono} style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                    {new Date(log.created_at).toLocaleString('en-PH')}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem' }}>
                      <div style={{ fontWeight: 600 }}>{log.actor_name ?? 'System'}</div>
                      <div className={styles.muted}>{log.actor_email ?? ''}</div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.actionBadge} style={actionColor(log.action)}>
                      {log.action}
                    </span>
                  </td>
                  <td><code style={{ fontSize: '0.8125rem' }}>{log.entity_type}</code></td>
                  <td className={styles.muted}>{log.entity_id ?? '—'}</td>
                  <td className={styles.mono} style={{ fontSize: '0.75rem' }}>{log.ip_address ?? '—'}</td>
                  <td>
                    {(log.old_value || log.new_value) && (
                      <button
                        onClick={() => setExpanded(prev => prev === log.id ? null : log.id)}
                        className={styles.expandBtn}
                      >
                        {expanded === log.id ? '▲' : '▼'}
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === log.id && (
                  <tr key={`${log.id}-detail`} className={styles.detailRow}>
                    <td colSpan={7}>
                      <div className={styles.diffGrid}>
                        {log.old_value && (
                          <div className={styles.diffBox}>
                            <div className={styles.diffLabel}>Before</div>
                            <pre>{formatJson(log.old_value)}</pre>
                          </div>
                        )}
                        {log.new_value && (
                          <div className={styles.diffBox}>
                            <div className={styles.diffLabel}>After</div>
                            <pre>{formatJson(log.new_value)}</pre>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>&larr; Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>Next &rarr;</button>
        </div>
      )}
    </div>
  )
}

function formatJson(val: string) {
  try { return JSON.stringify(JSON.parse(val), null, 2) }
  catch { return val }
}
