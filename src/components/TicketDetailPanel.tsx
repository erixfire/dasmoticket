import { useState, useEffect, useRef } from 'react'
import type { Ticket, TicketNote, Schedule, Survey } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { StatusBadge, PriorityBadge, Badge, Spinner, toast } from '@/components/ui'
import ScheduleModal from './ScheduleModal'
import SurveyModal from './SurveyModal'
import styles from './TicketDetailPanel.module.css'

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']

interface Props {
  ticket: Ticket
  notes: TicketNote[]
  onClose: () => void
  onUpdated: () => void
}

export default function TicketDetailPanel({ ticket, notes: initNotes, onClose, onUpdated }: Props) {
  const { user }    = useAuth()
  const panelRef    = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [notes, setNotes]         = useState(initNotes)
  const [noteText, setNoteText]   = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [status, setStatus]       = useState(ticket.status)
  const [saving, setSaving]       = useState(false)
  const [noteSaving, setNoteSaving] = useState(false)
  const [schedule, setSchedule]   = useState<Schedule | null>(null)
  const [survey, setSurvey]       = useState<Survey | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showSurvey, setShowSurvey]     = useState(false)

  const isStaff = user?.role === 'it_staff' || user?.role === 'admin'
  const isOwner = user?.id === ticket.requester_id

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Focus trap: move focus into panel on open
  useEffect(() => { panelRef.current?.focus() }, [])

  useEffect(() => {
    api.tickets.getSchedule(ticket.id).then(r => setSchedule(r.data.schedule)).catch(() => {})
    if (status === 'Resolved' || ticket.status === 'Resolved') {
      api.tickets.getSurvey(ticket.id).then(r => setSurvey(r.data.survey)).catch(() => {})
    }
  }, [ticket.id, status, ticket.status])

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true)
    try {
      await api.tickets.update(ticket.id, { status: newStatus as Ticket['status'] })
      setStatus(newStatus as Ticket['status'])
      onUpdated()
      toast('success', `Status updated to ${newStatus}.`)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to update status')
    } finally { setSaving(false) }
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setNoteSaving(true)
    try {
      const res = await api.tickets.addNote(ticket.id, noteText.trim(), isInternal) as { data: { notes: TicketNote[] } }
      setNotes(res.data.notes)
      setNoteText('')
      setIsInternal(false)
      textareaRef.current?.focus()
      toast('success', isInternal ? 'Internal note added.' : 'Note added.')
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to add note')
    } finally { setNoteSaving(false) }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote()
  }

  const showSurveyPrompt = isOwner && (status === 'Resolved' || ticket.status === 'Resolved') && !survey

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Ticket ${ticket.ticket_number}`}
        tabIndex={-1}
      >
        {/* Header */}
        <div className={styles.panelHeader}>
          <div className={styles.headerLeft}>
            <code className={styles.ticketNum}>{ticket.ticket_number}</code>
            <h3 className={styles.title}>{ticket.title}</h3>
          </div>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close panel">×</button>
        </div>

        {/* Meta grid */}
        <section className={styles.meta} aria-label="Ticket details">
          <MetaRow label="Status">
            {isStaff ? (
              <div className={styles.statusSelectWrap}>
                <select
                  value={status}
                  onChange={e => handleStatusChange(e.target.value)}
                  className={styles.statusSelect}
                  disabled={saving}
                >
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                {saving && <Spinner size="sm" />}
              </div>
            ) : <StatusBadge status={status} />}
          </MetaRow>
          <MetaRow label="Priority"><PriorityBadge priority={ticket.priority} /></MetaRow>
          <MetaRow label="Category">
            <Badge variant="default">{ticket.category}</Badge>
          </MetaRow>
          <MetaRow label="Requester"><span>{ticket.requester_name}</span></MetaRow>
          <MetaRow label="Assigned To">
            {ticket.assigned_name
              ? <span>{ticket.assigned_name}</span>
              : <span className={styles.muted}><em>Unassigned</em></span>}
          </MetaRow>
          <MetaRow label="Department">
            <span>{ticket.department_name ?? <span className={styles.muted}>—</span>}</span>
          </MetaRow>
          <MetaRow label="Opened">
            <span className={styles.mono}>
              {new Date(ticket.created_at).toLocaleString('en-PH', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </MetaRow>
        </section>

        {/* Description */}
        {ticket.description && (
          <section className={styles.descSection}>
            <p className={styles.sectionLabel}>Description</p>
            <p className={styles.descText}>{ticket.description}</p>
          </section>
        )}

        {/* Schedule */}
        <section className={styles.scheduleSection}>
          <p className={styles.sectionLabel}>🗓 Repair Schedule</p>
          {schedule ? (
            <div className={styles.scheduleGrid}>
              <MetaRow label="Type"><Badge variant="info">{schedule.repair_type}</Badge></MetaRow>
              <MetaRow label="Date">
                <span className={styles.mono}>
                  {schedule.scheduled_date
                    ? new Date(schedule.scheduled_date).toLocaleString('en-PH', {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : <em>Not set</em>}
                </span>
              </MetaRow>
              <MetaRow label="Status"><StatusBadge status={schedule.status} /></MetaRow>
              {schedule.location_notes && (
                <MetaRow label="Location"><span>{schedule.location_notes}</span></MetaRow>
              )}
            </div>
          ) : (
            <div className={styles.noSchedule}>
              <span className={styles.muted}>No repair schedule yet.</span>
              {(isStaff || isOwner) && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                <button onClick={() => setShowSchedule(true)} className={styles.scheduleBtn}>
                  + Schedule Repair
                </button>
              )}
            </div>
          )}
        </section>

        {/* Survey prompt / result */}
        {showSurveyPrompt && (
          <div className={styles.surveyPrompt}>
            <span>⭐ Your ticket is resolved! Please rate the service.</span>
            <button onClick={() => setShowSurvey(true)} className={styles.surveyBtn}>Give Feedback</button>
          </div>
        )}
        {survey && (
          <div className={styles.surveyDone}>
            <span className={styles.surveyStars}>
              {'★'.repeat(survey.rating)}{'☆'.repeat(5 - survey.rating)}
            </span>
            <div>
              <span className={styles.surveyScore}>{survey.rating}/5</span>
              <span className={styles.muted}> — Feedback submitted</span>
            </div>
            {survey.comments && <p className={styles.surveyComments}>{survey.comments}</p>}
          </div>
        )}

        {/* Notes */}
        <section className={styles.notesSection}>
          <h4 className={styles.notesTitle}>Notes &amp; Updates</h4>

          <div className={styles.notesList}>
            {notes.length === 0 ? (
              <div className={styles.noNotes}>
                <span className={styles.noNotesIcon}>💬</span>
                <p>No notes yet. Add the first update below.</p>
              </div>
            ) : (
              notes.map(n => (
                <div key={n.id} className={`${styles.note} ${n.is_internal ? styles.internal : ''}`}>
                  <div className={styles.noteHeader}>
                    <strong>{n.author_name}</strong>
                    {!!n.is_internal && (
                      <Badge variant="warning" size="xs">Internal</Badge>
                    )}
                    <span className={styles.noteDate}>
                      {new Date(n.created_at).toLocaleString('en-PH', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className={styles.noteText}>{n.note}</p>
                </div>
              ))
            )}
          </div>

          {/* Note input */}
          <div className={styles.noteInput}>
            <textarea
              ref={textareaRef}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a note or update…  (Ctrl+Enter to submit)"
              rows={3}
              className={styles.noteTextarea}
            />
            <div className={styles.noteInputFooter}>
              {isStaff && (
                <label className={styles.internalCheck}>
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={e => setIsInternal(e.target.checked)}
                  />
                  Internal note
                  <span className={styles.internalHint}>(hidden from requester)</span>
                </label>
              )}
              <button
                onClick={handleAddNote}
                disabled={noteSaving || !noteText.trim()}
                className={styles.noteBtn}
              >
                {noteSaving ? <><Spinner size="sm" /> Saving…</> : 'Add Note'}
              </button>
            </div>
          </div>
        </section>
      </div>

      <ScheduleModal
        ticket={ticket}
        open={showSchedule}
        onClose={() => setShowSchedule(false)}
        onCreated={() => {
          api.tickets.getSchedule(ticket.id).then(r => setSchedule(r.data.schedule)).catch(() => {})
          toast('success', 'Repair schedule created.')
        }}
      />

      <SurveyModal
        ticket={ticket}
        open={showSurvey}
        onClose={() => setShowSurvey(false)}
        onSubmitted={() => {
          api.tickets.getSurvey(ticket.id).then(r => setSurvey(r.data.survey)).catch(() => {})
          toast('success', 'Thank you for your feedback!')
        }}
      />
    </>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{children}</span>
    </div>
  )
}
