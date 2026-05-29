import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import type { Schedule } from '@/types'
import MiniCalendar from '@/components/MiniCalendar'
import {
  PageHeader, StatusBadge, Badge,
  SkeletonCard, EmptyState, toast,
} from '@/components/ui'
import styles from './SchedulePage.module.css'

export default function SchedulePage() {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear]               = useState(now.getFullYear())
  const [month, setMonth]             = useState(now.getMonth())
  const [dayData, setDayData]         = useState<{ date: string; count: number }[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [schedules, setSchedules]     = useState<Schedule[]>([])
  const [loading, setLoading]         = useState(false)
  const [updatingId, setUpdatingId]   = useState<number | null>(null)

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await api.schedules.calendar(monthStr)
      setDayData(res.data.days)
    } catch { toast('error', 'Failed to load calendar data.') }
  }, [monthStr])

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (selectedDate) {
        params.date_from = selectedDate
        params.date_to   = selectedDate
      } else {
        params.date_from = `${monthStr}-01`
        params.date_to   = `${monthStr}-31`
      }
      const res = await api.schedules.list(params)
      setSchedules(res.data.schedules)
    } catch { toast('error', 'Failed to load schedules.') }
    finally { setLoading(false) }
  }, [selectedDate, monthStr])

  useEffect(() => { fetchCalendar() }, [fetchCalendar])
  useEffect(() => { fetchSchedules() }, [fetchSchedules])

  const handleStatusUpdate = async (scheduleId: number, status: string) => {
    setUpdatingId(scheduleId)
    try {
      await api.schedules.update(scheduleId, status)
      await Promise.all([fetchCalendar(), fetchSchedules()])
      toast('success', `Schedule marked as ${status}.`)
    } catch {
      toast('error', 'Failed to update schedule status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const isStaff = user?.role === 'it_staff' || user?.role === 'admin'

  // Determine subtitle text
  const subtitle = selectedDate
    ? `Showing schedules for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
    : `${schedules.length} schedule${schedules.length !== 1 ? 's' : ''} in ${new Date(year, month).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}`

  return (
    <div className={styles.page}>
      <PageHeader
        title="Repair Schedule"
        subtitle="View and manage scheduled repairs"
        actions={
          selectedDate ? (
            <button onClick={() => setSelectedDate(null)} className={styles.clearDate}>
              × Clear date filter
            </button>
          ) : undefined
        }
      />

      <div className={styles.layout}>
        {/* Calendar sidebar */}
        <aside className={styles.calendarCol}>
          <MiniCalendar
            year={year}
            month={month}
            dayData={dayData}
            selectedDate={selectedDate}
            onSelectDate={d => setSelectedDate(prev => prev === d ? null : d)}
            onMonthChange={(y, m) => { setYear(y); setMonth(m); setSelectedDate(null) }}
          />
        </aside>

        {/* Schedule list */}
        <main className={styles.listCol}>
          <div className={styles.listHeader}>
            <p className={styles.listSubtitle}>{subtitle}</p>
          </div>

          {loading ? (
            <div className={styles.skeletonGrid}>
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : schedules.length === 0 ? (
            <EmptyState
              icon="📅"
              title={selectedDate ? 'No schedules on this date' : 'No schedules this month'}
              description={selectedDate
                ? 'Select a different date or clear the filter to see all.'
                : 'Schedules will appear here once tickets are scheduled for this month.'}
              action={selectedDate
                ? { label: 'Clear date filter', onClick: () => setSelectedDate(null) }
                : undefined}
            />
          ) : (
            <div className={styles.cards}>
              {schedules.map(s => (
                <div key={s.id} className={`${styles.card} ${updatingId === s.id ? styles.cardUpdating : ''}`}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardTitleGroup}>
                      <code className={styles.ticketNum}>{s.ticket_number}</code>
                      <p className={styles.ticketTitle}>{s.ticket_title}</p>
                    </div>
                    <Badge variant={s.repair_type === 'Onsite' ? 'info' : 'success'}>
                      {s.repair_type === 'Onsite' ? '🏢' : '🔧'} {s.repair_type}
                    </Badge>
                  </div>

                  <div className={styles.cardMeta}>
                    <MetaItem icon="📅" label="Scheduled">
                      {s.scheduled_date
                        ? new Date(s.scheduled_date).toLocaleString('en-PH', {
                            weekday: 'short', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : <em>Not set</em>}
                    </MetaItem>
                    <MetaItem icon="👤" label="Requester">{s.requester_name}</MetaItem>
                    <MetaItem icon="🔧" label="Assigned">
                      {s.assigned_name ?? <em className={styles.unassigned}>Unassigned</em>}
                    </MetaItem>
                    {s.location_notes && (
                      <MetaItem icon="📍" label="Location">{s.location_notes}</MetaItem>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    <StatusBadge status={s.status} />
                    {isStaff && (
                      <div className={styles.actionGroup}>
                        {s.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(s.id, 'Confirmed')}
                              className={`${styles.actionBtn} ${styles.confirm}`}
                              disabled={updatingId === s.id}
                            >
                              ✓ Confirm
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(s.id, 'Cancelled')}
                              className={`${styles.actionBtn} ${styles.cancel}`}
                              disabled={updatingId === s.id}
                            >
                              × Cancel
                            </button>
                          </>
                        )}
                        {s.status === 'Confirmed' && (
                          <button
                            onClick={() => handleStatusUpdate(s.id, 'Completed')}
                            className={`${styles.actionBtn} ${styles.complete}`}
                            disabled={updatingId === s.id}
                          >
                            ✓ Mark Complete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function MetaItem({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{icon} {label}</span>
      <strong className={styles.metaValue}>{children}</strong>
    </div>
  )
}
