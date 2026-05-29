import { useState, FormEvent } from 'react'
import { api } from '@/lib/api'
import type { Ticket } from '@/types'
import styles from './CreateTicketModal.module.css'

interface Props {
  ticket: Ticket
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function ScheduleModal({ ticket, open, onClose, onCreated }: Props) {
  const [repairType, setRepairType] = useState<'Onsite' | 'Offsite'>('Onsite')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [locationNotes, setLocationNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => { setRepairType('Onsite'); setDate(''); setTime('09:00'); setLocationNotes(''); setError('') }
  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!date) { setError('Please select a date'); return }
    const scheduledDate = new Date(`${date}T${time}:00`).toISOString()
    setLoading(true)
    try {
      await api.schedules.create({
        ticket_id: ticket.id,
        repair_type: repairType,
        scheduled_date: scheduledDate,
        location_notes: locationNotes || undefined,
      })
      reset()
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule')
    } finally { setLoading(false) }
  }

  if (!open) return null

  // Minimum date = today
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>Schedule Repair</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
              {ticket.ticket_number} — {ticket.title}
            </p>
          </div>
          <button onClick={handleClose} className={styles.closeBtn}>×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label>Repair Type *</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {(['Onsite', 'Offsite'] as const).map(t => (
                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="radio" name="repairType" value={t} checked={repairType === t} onChange={() => setRepairType(t)} />
                  <span>{t === 'Onsite' ? '🏢 Onsite (at department)' : '🔧 Offsite (bring to IT office)'}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Date *</label>
              <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label>Time *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} required />
            </div>
          </div>

          <div className={styles.field}>
            <label>
              {repairType === 'Onsite' ? 'Location / Room / Floor' : 'Drop-off Instructions'}
            </label>
            <input
              value={locationNotes}
              onChange={e => setLocationNotes(e.target.value)}
              placeholder={repairType === 'Onsite' ? 'e.g. 3rd Floor, HR Office, Room 312' : 'e.g. Bring unit to IT Office, Ground Floor'}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={handleClose} className={styles.cancelBtn}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Scheduling...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
