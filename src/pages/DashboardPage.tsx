import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/StatusBadge'
import styles from './DashboardPage.module.css'

interface Stats {
  total: number
  open: number
  in_progress: number
  resolved_today: number
  critical: number
}

interface SurveyStats {
  avg_rating: number
  total: number
  distribution: Record<number, number>
}

const STAT_CARDS = [
  { key: 'total',          label: 'Total Tickets',     icon: '🎫', color: '#6366f1' },
  { key: 'open',           label: 'Open',              icon: '📬', color: '#3b82f6' },
  { key: 'in_progress',    label: 'In Progress',       icon: '🔧', color: '#f59e0b' },
  { key: 'resolved_today', label: 'Resolved Today',    icon: '✅', color: '#22c55e' },
  { key: 'critical',       label: 'Critical',          icon: '🔴', color: '#ef4444' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [surveyStats, setSurveyStats] = useState<SurveyStats | null>(null)
  const [recentTickets, setRecentTickets] = useState<import('@/types').Ticket[]>([])

  useEffect(() => {
    api.dashboard.stats().then(r => setStats(r.data.stats)).catch(console.error)
    api.tickets.list({ limit: '5' }).then(r => setRecentTickets(r.data.tickets)).catch(console.error)
    if (user?.role === 'it_staff' || user?.role === 'admin') {
      api.surveys.stats().then(r => setSurveyStats(r.data.stats)).catch(console.error)
    }
  }, [user])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Dashboard</h1>
          <p className={styles.welcome}>Welcome back, <strong>{user?.name}</strong></p>
        </div>
      </div>

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        {STAT_CARDS.map(({ key, label, icon, color }) => (
          <div key={key} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: `${color}18`, color }}>{icon}</div>
            <div>
              <div className={styles.statValue} style={{ color }}>
                {stats ? (stats as Record<string, number>)[key] : '—'}
              </div>
              <div className={styles.statLabel}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Survey summary for IT staff/admin */}
      {surveyStats && (
        <div className={styles.surveyBanner}>
          <div className={styles.surveyAvg}>
            <span className={styles.surveyScore}>{surveyStats.total === 0 ? '—' : surveyStats.avg_rating?.toFixed(1)}</span>
            <div>
              <div className={styles.surveyStars}>
                {[1,2,3,4,5].map(s => (
                  <span key={s} style={{ color: s <= Math.round(surveyStats.avg_rating) ? '#f59e0b' : '#d1d5db' }}>★</span>
                ))}
              </div>
              <div className={styles.surveyLabel}>Service Satisfaction</div>
              <div className={styles.surveySub}>{surveyStats.total} responses</div>
            </div>
          </div>
          <a href="/surveys" className={styles.surveyLink}>View Full Report →</a>
        </div>
      )}

      {/* Recent tickets */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Recent Tickets</h2>
          <a href="/tickets" className={styles.seeAll}>See all →</a>
        </div>
        <div className={styles.ticketList}>
          {recentTickets.length === 0 && <div className={styles.empty}>No tickets yet.</div>}
          {recentTickets.map(t => (
            <div key={t.id} className={styles.ticketRow}>
              <code className={styles.ticketNum}>{t.ticket_number}</code>
              <span className={styles.ticketTitle}>{t.title}</span>
              <StatusBadge status={t.status} />
              <span className={styles.ticketDate}>{new Date(t.created_at).toLocaleDateString('en-PH')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
