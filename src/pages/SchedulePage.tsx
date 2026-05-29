import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import type { Schedule } from '@/types'
import MiniCalendar from '@/components/MiniCalendar'
import { StatusBadge } from '@/components/StatusBadge'
import styles from './SchedulePage.module.css'

export default function SchedulePage() {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [dayData, setDayData] = useState<{ date: string; count: number }[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await api.schedules.calendar(monthStr)
      setDayData(res.data.days)
    } catch (e) { console.error(e) }
  }, [monthStr])

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (selectedDate) {
        params.date_from = selectedDate
        params.date_to = selectedDate
      } else {
        params.date_from = `${monthStr}-01`
        params.date_to = `${monthStr}-31`
      }
      const res = await api.schedules.list(params)
      setSchedules(res.data.schedules)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [selectedDate, monthStr])

  useEffect(() => { fetchCalendar() }, [fetchCalendar])
  useEffect(() => { fetchSchedules() }, [fetchSchedules])

  const handleStatusUpdate = async (scheduleId: number, status: string) => {
    try {
      await api.schedules.update(scheduleId, status)
      await Promise.all([fetchCalendar(), fetchSchedules()])
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed to update') }
  }

  const isStaff = user?.role === 'it_staff' || user?.role === 'admin'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Repair Schedule</h1>
        <p className={styles.subtitle}>View and manage scheduled repairs</p>
      </div>

      <div className={styles.layout}>
        <aside className={styles.calendarCol}>
          <MiniCalendar
            year={year}
            month={month}
            dayData={dayData}
            selectedDate={selectedDate}
            onSelectDate={d => setSelectedDate(prev => prev === d ? null : d)}
            onMonthChange={(y, m) => { setYear(y); setMonth(m); setSelectedDate(null) }}
          />
          {selectedDate && (
            <button onClick={() => setSelectedDate(null)} className={styles.clearDate}>
              × Clear date filter
            </button>
          )}
        </aside>

        <main className={styles.listCol}>
          <div className={styles.listHeader}>
            <h2>{selectedDate ? `Schedules for ${selectedDate}` : `All schedules — ${monthStr}`}</h2>
            <span className={styles.count}>{schedules.length} result{schedules.length !== 1 ? 's' : ''}</span>
          </div>

          {loading && <div className={styles.loading}>Loading...</div>}

          {!loading && schedules.length === 0 && (
            <div className={styles.empty}>📅 No schedules found for this period.</div>
          )}

          <div className={styles.cards}>
            {schedules.map(s => (
              <div key={s.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <code className={styles.ticketNum}>{s.ticket_number}</code>
                    <p className={styles.ticketTitle}>{s.ticket_title}</p>
                  </div>
                  <RepairTypePill type={s.repair_type} />
                </div>

                <div className={styles.cardMeta}>
                  <div className={styles.metaItem}>
                    <span>📅 Scheduled</span>
                    <strong>{s.scheduled_date ? new Date(s.scheduled_date).toLocaleString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</strong>
                  </div>
                  <div className={styles.metaItem}>
                    <span>👤 Requester</span>
                    <strong>{s.requester_name}</strong>
                  </div>
                  <div className={styles.metaItem}>
                    <span>🔧 Assigned</span>
                    <strong>{s.assigned_name ?? <em>Unassigned</em>}</strong>
                  </div>
                  {s.location_notes && (
                    <div className={styles.metaItem}>
                      <span>📍 Location</span>
                      <strong>{s.location_notes}</strong>
                    </div>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <StatusBadge status={s.status as 'Open'} />
                  {isStaff && (
                    <div className={styles.actions}>
                      {s.status === 'Pending' && (
                        <>
                          <button onClick={() => handleStatusUpdate(s.id, 'Confirmed')} className={`${styles.actionBtn} ${styles.confirm}`}>✓ Confirm</button>
                          <button onClick={() => handleStatusUpdate(s.id, 'Cancelled')} className={`${styles.actionBtn} ${styles.cancel}`}>✕ Cancel</button>
                        </>
                      )}
                      {s.status === 'Confirmed' && (
                        <button onClick={() => handleStatusUpdate(s.id, 'Completed')} className={`${styles.actionBtn} ${styles.complete}`}>✓ Mark Complete</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

function RepairTypePill({ type }: { type: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.2rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600,
      background: type === 'Onsite' ? '#eff6ff' : '#f0fdf4',
      color: type === 'Onsite' ? '#1d4ed8' : '#15803d',
      border: `1px solid ${type === 'Onsite' ? '#bfdbfe' : '#bbf7d0'}`,
    }}>
      {type === 'Onsite' ? '🏢' : '🔧'} {type}
    </span>
  )
}
