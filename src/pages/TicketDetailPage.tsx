import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Ticket, TicketNote } from '@/types'
import { Spinner, toast, Badge, RoleBadge } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import styles from './TicketDetailPage.module.css'

const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved', 'Closed'] as const
const PRIORITY_COLORS: Record<string, string> = {
  Low: '#16a34a', Medium: '#d97706', High: '#ea580c', Critical: '#ff4757',
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const [ticket, setTicket]       = useState<Ticket | null>(null)
  const [notes, setNotes]         = useState<TicketNote[]>([])
  const [loading, setLoading]     = useState(true)
  const [noteText, setNoteText]   = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [staff, setStaff]         = useState<import('@/types').User[]>([])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [res, staffRes] = await Promise.all([
        api.tickets.get(Number(id)),
        api.users.staff(),
      ])
      setTicket(res.data.ticket)
      setNotes(res.data.notes)
      setStaff(staffRes.data.staff)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to load ticket')
      navigate('/tickets')
    } finally { setLoading(false) }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/tickets')
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleAddNote()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const handleStatusChange = async (status: string) => {
    if (!ticket) return
    setUpdatingStatus(true)
    try {
      await api.tickets.update(ticket.id, { status: status as Ticket['status'] })
      setTicket(t => t ? { ...t, status: status as Ticket['status'] } : t)
      toast('success', `Status updated to ${status}`)
    } catch (e) { toast('error', e instanceof Error ? e.message : 'Failed to update') }
    finally { setUpdatingStatus(false) }
  }

  const handleAssign = async (userId: number | null) => {
    if (!ticket) return
    try {
      await api.tickets.update(ticket.id, { assigned_to: userId })
      const found = staff.find(s => s.id === userId)
      setTicket(t => t ? { ...t, assigned_to: userId, assigned_name: found?.name ?? null } : t)
      toast('success', userId ? `Assigned to ${found?.name}` : 'Unassigned')
    } catch (e) { toast('error', e instanceof Error ? e.message : 'Failed to assign') }
  }

  const handleAddNote = async () => {
    if (!ticket || !noteText.trim()) return
    setSavingNote(true)
    try {
      await api.tickets.addNote(ticket.id, noteText.trim(), isInternal)
      setNoteText('')
      toast('success', 'Note added')
      load()
    } catch (e) { toast('error', e instanceof Error ? e.message : 'Failed to add note') }
    finally { setSavingNote(false) }
  }

  const canEdit = user?.role === 'it_staff' || user?.role === 'admin'

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.loadingWrap}><Spinner size="lg" /></div>
    </div>
  )

  if (!ticket) return null

  const resolveMs = ticket.resolved_at
    ? new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime()
    : null
  const resolveDuration = resolveMs
    ? resolveMs < 3600000
      ? `${Math.round(resolveMs / 60000)}m`
      : resolveMs < 86400000
        ? `${Math.round(resolveMs / 3600000)}h`
        : `${Math.round(resolveMs / 86400000)}d`
    : null

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/tickets')} aria-label="Back">
          ← Back
        </button>
        <div className={styles.headerMeta}>
          <span className={styles.ticketNum}>#{ticket.ticket_number}</span>
          <Badge variant={statusVariant(ticket.status)} dot>{ticket.status}</Badge>
          <span className={styles.priorityDot} style={{ background: PRIORITY_COLORS[ticket.priority] }} />
          <span className={styles.priorityLabel}>{ticket.priority}</span>
        </div>
      </div>

      <h1 className={styles.title}>{ticket.title}</h1>
      <p className={styles.subtitle}>
        Opened by <strong>{ticket.requester_name ?? 'Unknown'}</strong>&nbsp;·&nbsp;
        {new Date(ticket.created_at).toLocaleString('en-PH')}
        {ticket.department_name && <>&nbsp;·&nbsp;{ticket.department_name}</>}
      </p>

      {/* ── Two-column layout ── */}
      <div className={styles.grid}>
        {/* LEFT — main content */}
        <div className={styles.main}>

          {/* Description card */}
          {ticket.description && (
            <div className={styles.card}>
              <div className={styles.cardLabel}>Description</div>
              <p className={styles.description}>{ticket.description}</p>
            </div>
          )}

          {/* Notes / activity */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Activity &amp; Notes
              <span className={styles.noteCount}>{notes.length}</span>
            </div>

            {notes.length === 0 ? (
              <p className={styles.emptyNotes}>No notes yet. Add one below.</p>
            ) : (
              <ul className={styles.timeline}>
                {notes.map(n => (
                  <li key={n.id} className={`${styles.timelineItem} ${n.is_internal ? styles.internal : ''}`}>
                    <div className={styles.timelineAvatar}>{(n.author_name ?? '?')[0].toUpperCase()}</div>
                    <div className={styles.timelineBody}>
                      <div className={styles.timelineMeta}>
                        <strong>{n.author_name ?? 'Unknown'}</strong>
                        {n.is_internal && <span className={styles.internalBadge}>Internal</span>}
                        <span className={styles.timelineTime}>{new Date(n.created_at).toLocaleString('en-PH')}</span>
                      </div>
                      <p className={styles.timelineNote}>{n.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Add note form */}
            <div className={styles.noteForm}>
              <textarea
                ref={noteRef}
                className={styles.noteInput}
                placeholder="Write a note… (Ctrl+Enter to submit)"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={3}
              />
              <div className={styles.noteActions}>
                {canEdit && (
                  <label className={styles.internalToggle}>
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={e => setIsInternal(e.target.checked)}
                    />
                    Internal only
                  </label>
                )}
                <button
                  className={styles.submitNote}
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || savingNote}
                >
                  {savingNote ? <Spinner size="sm" /> : null}
                  {savingNote ? 'Saving…' : 'Add Note'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — metadata rail */}
        <aside className={styles.rail}>

          {/* Status control */}
          {canEdit && (
            <div className={styles.card}>
              <div className={styles.cardLabel}>Update Status
                {updatingStatus && <Spinner size="sm" />}
              </div>
              <div className={styles.statusGrid}>
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    className={`${styles.statusBtn} ${ticket.status === s ? styles.statusActive : ''}`}
                    onClick={() => handleStatusChange(s)}
                    disabled={updatingStatus || ticket.status === s}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ticket meta */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Details</div>
            <dl className={styles.metaList}>
              <dt>Category</dt><dd><span className={styles.chip}>{ticket.category}</span></dd>
              <dt>Priority</dt>
              <dd>
                <span className={styles.priorityChip} style={{ color: PRIORITY_COLORS[ticket.priority] }}>
                  ● {ticket.priority}
                </span>
              </dd>
              <dt>Department</dt><dd>{ticket.department_name ?? <span className={styles.muted}>—</span>}</dd>
              <dt>Created</dt><dd className={styles.mono}>{new Date(ticket.created_at).toLocaleDateString('en-PH')}</dd>
              <dt>Updated</dt><dd className={styles.mono}>{new Date(ticket.updated_at).toLocaleDateString('en-PH')}</dd>
              {resolveDuration && <><dt>Resolved in</dt><dd className={styles.mono}>{resolveDuration}</dd></>}
            </dl>
          </div>

          {/* Assignee */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Assigned To</div>
            {ticket.assigned_name ? (
              <div className={styles.assigneeChip}>
                <div className={styles.assigneeAvatar}>{ticket.assigned_name[0].toUpperCase()}</div>
                <span>{ticket.assigned_name}</span>
              </div>
            ) : (
              <p className={styles.muted}>Unassigned</p>
            )}
            {canEdit && (
              <select
                className={styles.assignSelect}
                value={ticket.assigned_to ?? ''}
                onChange={e => handleAssign(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— Unassigned —</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>

          {/* Requester */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Requester</div>
            <div className={styles.assigneeChip}>
              <div className={styles.assigneeAvatar}>
                {(ticket.requester_name ?? '?')[0].toUpperCase()}
              </div>
              <div>
                <div className={styles.requesterName}>{ticket.requester_name ?? 'Unknown'}</div>
              </div>
            </div>
          </div>

        </aside>
      </div>
    </div>
  )
}

function statusVariant(s: string): 'success' | 'warning' | 'error' | 'default' {
  if (s === 'Resolved' || s === 'Closed') return 'success'
  if (s === 'In Progress') return 'warning'
  if (s === 'Open') return 'error'
  return 'default'
}
