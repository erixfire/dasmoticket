import { useState, useEffect } from 'react'
import type { Ticket, TicketNote, Schedule, Survey } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { StatusBadge, PriorityBadge } from './StatusBadge'
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
  const { user } = useAuth()
  const [notes, setNotes] = useState(initNotes)
  const [noteText, setNoteText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [status, setStatus] = useState(ticket.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showSurvey, setShowSurvey] = useState(false)

  const isStaff = user?.role === 'it_staff' || user?.role === 'admin'
  const isOwner = user?.id === ticket.requester_id

  useEffect(() => {
    api.tickets.getSchedule(ticket.id).then(r => setSchedule(r.data.schedule)).catch(() => {})
    if (status === 'Resolved' || ticket.status === 'Resolved') {
      api.tickets.getSurvey(ticket.id).then(r => setSurvey(r.data.survey)).catch(() => {})
    }
  }, [ticket.id, status, ticket.status])

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true); setError('')
    try {
      await api.tickets.update(ticket.id, { status: newStatus as Ticket['status'] })
      setStatus(newStatus as Ticket['status'])
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally { setSaving(false) }
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setSaving(true); setError('')
    try {
      const res = await api.tickets.addNote(ticket.id, noteText.trim(), isInternal) as { data: { notes: TicketNote[] } }
      setNotes(res.data.notes)
      setNoteText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note')
    } finally { setSaving(false) }
  }

  const showSurveyPrompt = isOwner && (status === 'Resolved' || ticket.status === 'Resolved') && !survey

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <code className={styles.ticketNum}>{ticket.ticket_number}</code>
            <h3 className={styles.title}>{ticket.title}</h3>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>×</button>
        </div>

        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <span>Status</span>
            {isStaff ? (
              <select value={status} onChange={e => handleStatusChange(e.target.value)} className={styles.statusSelect} disabled={saving}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            ) : <StatusBadge status={status} />}
          </div>
          <div className={styles.metaRow}><span>Priority</span><PriorityBadge priority={ticket.priority} /></div>
          <div className={styles.metaRow}><span>Category</span><span>{ticket.category}</span></div>
          <div className={styles.metaRow}><span>Requester</span><span>{ticket.requester_name}</span></div>
          <div className={styles.metaRow}><span>Assigned To</span><span>{ticket.assigned_name ?? <em>Unassigned</em>}</span></div>
          <div className={styles.metaRow}><span>Department</span><span>{ticket.department_name ?? '—'}</span></div>
          <div className={styles.metaRow}><span>Opened</span><span>{new Date(ticket.created_at).toLocaleString('en-PH')}</span></div>
        </div>

        {/* Schedule Section */}
        <div className={styles.scheduleSection}>
          <div className={styles.sectionLabel}>🗓 Repair Schedule</div>
          {schedule ? (
            <div className={styles.scheduleInfo}>
              <div className={styles.metaRow}><span>Type</span><span>{schedule.repair_type}</span></div>
              <div className={styles.metaRow}><span>Date</span><span>{schedule.scheduled_date ? new Date(schedule.scheduled_date).toLocaleString('en-PH') : '—'}</span></div>
              <div className={styles.metaRow}><span>Status</span><span>{schedule.status}</span></div>
              {schedule.location_notes && <div className={styles.metaRow}><span>Location</span><span>{schedule.location_notes}</span></div>}
            </div>
          ) : (
            <div className={styles.noSchedule}>
              <span>No repair schedule yet.</span>
              {(isStaff || isOwner) && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                <button onClick={() => setShowSchedule(true)} className={styles.scheduleBtn}>+ Schedule Repair</button>
              )}
            </div>
          )}
        </div>

        {/* Survey Prompt */}
        {showSurveyPrompt && (
          <div className={styles.surveyPrompt}>
            <span>⭐ Your ticket is resolved! Please rate the service.</span>
            <button onClick={() => setShowSurvey(true)} className={styles.surveyBtn}>Give Feedback</button>
          </div>
        )}
        {survey && (
          <div className={styles.surveyDone}>
            <span>{'★'.repeat(survey.rating)}{'☆'.repeat(5 - survey.rating)}</span>
            <span>Feedback submitted — {survey.rating}/5</span>
            {survey.comments && <p>{survey.comments}</p>}
          </div>
        )}

        {ticket.description && (
          <div className={styles.description}>
            <p className={styles.descLabel}>Description</p>
            <p>{ticket.description}</p>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.notesSection}>
          <h4>Notes & Updates</h4>
          <div className={styles.notesList}>
            {notes.length === 0 && <p className={styles.noNotes}>No notes yet.</p>}
            {notes.map(n => (
              <div key={n.id} className={`${styles.note} ${n.is_internal ? styles.internal : ''}`}>
                <div className={styles.noteHeader}>
                  <strong>{n.author_name}</strong>
                  {!!n.is_internal && <span className={styles.internalTag}>Internal</span>}
                  <span className={styles.noteDate}>{new Date(n.created_at).toLocaleString('en-PH')}</span>
                </div>
                <p>{n.note}</p>
              </div>
            ))}
          </div>
          <div className={styles.noteInput}>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note or update..." rows={3} />
            {isStaff && (
              <label className={styles.internalCheck}>
                <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
                Mark as internal (hidden from requester)
              </label>
            )}
            <button onClick={handleAddNote} disabled={saving || !noteText.trim()} className={styles.noteBtn}>
              {saving ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>

      <ScheduleModal
        ticket={ticket}
        open={showSchedule}
        onClose={() => setShowSchedule(false)}
        onCreated={() => api.tickets.getSchedule(ticket.id).then(r => setSchedule(r.data.schedule)).catch(() => {})}
      />

      <SurveyModal
        ticket={ticket}
        open={showSurvey}
        onClose={() => setShowSurvey(false)}
        onSubmitted={() => api.tickets.getSurvey(ticket.id).then(r => setSurvey(r.data.survey)).catch(() => {})}
      />
    </>
  )
}
