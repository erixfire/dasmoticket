import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '@/lib/adminApi'
import type { AuditLog } from '@/types'
import { SkeletonTable, EmptyState, Badge, toast } from '@/components/ui'
import type { BadgeVariant } from '@/components/ui'
import styles from './AdminTab.module.css'

function actionVariant(action: string): BadgeVariant {
  if (action.includes('DELETE') || action.includes('DEACTIVAT')) return 'danger'
  if (action.includes('CREATE')) return 'success'
  if (action.includes('UPDATE') || action.includes('CHANGE'))   return 'info'
  if (action.includes('LOGIN_FAILED') || action.includes('BLOCKED')) return 'danger'
  if (action.includes('LOGIN'))  return 'purple'
  if (action.includes('SUBMIT')) return 'warning'
  return 'default'
}

export default function AuditLogsTab() {
  const [logs, setLogs]                 = useState<AuditLog[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(1)
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [loading, setLoading]           = useState(false)
  const [expanded, setExpanded]         = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page) }
      if (filterAction) params.action      = filterAction
      if (filterEntity) params.entity_type = filterEntity
      const res = await adminApi.auditLogs.list(params)
      setLogs(res.logs)
      setTotal(res.total)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to load audit logs')
    } finally { setLoading(false) }
  }, [page, filterAction, filterEntity])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 30)
  const isFiltered = !!(filterAction || filterEntity)

  return (
    <div>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.count}>{total.toLocaleString()} log entr{total !== 1 ? 'ies' : 'y'}</span>
        <div className={styles.filters}>
          <input
            className={styles.filterInput}
            placeholder="Filter by action…"
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setPage(1) }}
          />
          <select
            className={styles.filterSelect}
            value={filterEntity}
            onChange={e => { setFilterEntity(e.target.value); setPage(1) }}
          >
            <option value="">All entities</option>
            {['users','tickets','schedules','surveys','departments'].map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          {isFiltered && (
            <button
              className={styles.clearFiltersBtn}
              onClick={() => { setFilterAction(''); setFilterEntity(''); setPage(1) }}
            >
              × Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon="📋"
          title={isFiltered ? 'No matching log entries' : 'No audit logs yet'}
          description={isFiltered
            ? 'Try a different action filter or entity type.'
            : 'System activity will be logged here automatically.'}
          action={isFiltered ? { label: '× Clear filters', onClick: () => { setFilterAction(''); setFilterEntity('') } } : undefined}
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th><th>Actor</th><th>Action</th>
                <th>Entity</th><th>ID</th><th>IP</th><th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <>
                  <tr key={log.id} className={expanded === log.id ? styles.rowExpanded : ''}>
                    <td className={`${styles.mono} ${styles.nowrap}`} style={{ fontSize: '0.75rem' }}>
                      {new Date(log.created_at).toLocaleString('en-PH')}
                    </td>
                    <td>
                      <div className={styles.actorCell}>
                        <span className={styles.actorName}>{log.actor_name ?? 'System'}</span>
                        <span className={styles.muted}>{log.actor_email ?? ''}</span>
                      </div>
                    </td>
                    <td><Badge variant={actionVariant(log.action)}>{log.action}</Badge></td>
                    <td><code className={styles.entityCode}>{log.entity_type}</code></td>
                    <td className={styles.muted}>{log.entity_id ?? '—'}</td>
                    <td className={`${styles.mono} ${styles.nowrap}`} style={{ fontSize: '0.75rem' }}>
                      {log.ip_address ?? '—'}
                    </td>
                    <td>
                      {(log.old_value || log.new_value) && (
                        <button
                          onClick={() => setExpanded(prev => prev === log.id ? null : log.id)}
                          className={styles.expandBtn}
                          aria-label={expanded === log.id ? 'Collapse' : 'Expand'}
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
                              <div className={`${styles.diffLabel} ${styles.diffBefore}`}>Before</div>
                              <pre className={styles.diffPre}>{formatJson(log.old_value)}</pre>
                            </div>
                          )}
                          {log.new_value && (
                            <div className={styles.diffBox}>
                              <div className={`${styles.diffLabel} ${styles.diffAfter}`}>After</div>
                              <pre className={styles.diffPre}>{formatJson(log.new_value)}</pre>
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>← Prev</button>
          <span>Page {page} of {totalPages} &middot; {total.toLocaleString()} entries</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>Next →</button>
        </div>
      )}
    </div>
  )
}

function formatJson(val: string) {
  try { return JSON.stringify(JSON.parse(val), null, 2) } catch { return val }
}
