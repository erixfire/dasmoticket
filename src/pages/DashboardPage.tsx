import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import type { Ticket } from '@/types'
import { StatusBadge, PriorityBadge, PageHeader, SkeletonStatCard, SkeletonTable, EmptyState } from '@/components/ui'
import styles from './DashboardPage.module.css'

interface Stats {
  total: number
  open: number
  in_progress: number
  resolved_today: number
  critical: number
  [key: string]: number
}

interface SurveyStats {
  avg_rating: number
  total: number
  distribution: Record<number, number>
}

// Bar-fill widths based on rough expected ranges per stat
const STAT_MAX: Record<string, number> = {
  total:          200,
  open:           100,
  in_progress:    80,
  resolved_today: 50,
  critical:       20,
}

const STAT_CARDS = [
  { key: 'total',          label: 'Total Tickets',  icon: '🎫', color: '#6366f1', trend: 'ALL' },
  { key: 'open',           label: 'Open',           icon: '📬', color: '#3b82f6', trend: 'NEW' },
  { key: 'in_progress',    label: 'In Progress',    icon: '🔧', color: '#f59e0b', trend: 'WIP' },
  { key: 'resolved_today', label: 'Resolved Today', icon: '✅', color: '#22c55e', trend: 'TODAY' },
  { key: 'critical',       label: 'Critical',       icon: '🔴', color: '#ef4444', trend: 'CRIT' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats]                   = useState<Stats | null>(null)
  const [surveyStats, setSurveyStats]       = useState<SurveyStats | null>(null)
  const [recentTickets, setRecentTickets]   = useState<Ticket[]>([])
  const [loading, setLoading]               = useState(true)
  const [ticketsLoading, setTicketsLoading] = useState(true)

  useEffect(() => {
    api.dashboard.stats()
      .then(r => setStats(r.data.stats as Stats))
      .catch(console.error)
      .finally(() => setLoading(false))

    api.tickets.list({ limit: '6' })
      .then(r => setRecentTickets(r.data.tickets))
      .catch(console.error)
      .finally(() => setTicketsLoading(false))

    if (user?.role === 'it_staff' || user?.role === 'admin') {
      api.surveys.stats()
        .then(r => setSurveyStats(r.data.stats))
        .catch(console.error)
    }
  }, [user])

  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })

  const maxDist = surveyStats
    ? Math.max(1, ...Object.values(surveyStats.distribution))
    : 1

  return (
    <div className={styles.page}>

      {/* ── Page header ── */}
      <div className={styles.pageHead}>
        <div className={styles.headLeft}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>
            Welcome back, {user?.name ?? 'user'}
          </p>
        </div>
        <div className={styles.dateChip}>
          <span className={styles.dateDot} aria-hidden="true" />
          {today}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.statsGrid}>
        {loading
          ? STAT_CARDS.map(c => <SkeletonStatCard key={c.key} />)
          : STAT_CARDS.map(({ key, label, icon, color, trend }) => {
              const val     = stats ? (stats[key] ?? 0) : 0
              const pct     = Math.min(100, (val / STAT_MAX[key]) * 100)
              return (
                <div key={key} className={styles.statCard}>
                  <div className={styles.statTop}>
                    <div className={styles.statIconWell}>{icon}</div>
                    <span className={styles.statTrend}>{trend}</span>
                  </div>
                  <div>
                    <div className={styles.statValue} style={{ color }}>{val}</div>
                    <div className={styles.statLabel}>{label}</div>
                  </div>
                  <div className={styles.statBar}>
                    <div
                      className={styles.statBarFill}
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              )
            })
        }
      </div>

      {/* ── Lower two-column grid ── */}
      <div className={styles.lowerGrid}>

        {/* Recent tickets panel */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Recent Tickets</span>
            <a href="/tickets" className={styles.seeAllLink}>View All →</a>
          </div>

          {ticketsLoading ? (
            <SkeletonTable rows={6} cols={4} />
          ) : recentTickets.length === 0 ? (
            <EmptyState
              icon="🎫"
              title="No tickets yet"
              description="Tickets you create or are assigned to will appear here."
              action={{ label: 'Create a ticket', onClick: () => window.location.href = '/tickets' }}
            />
          ) : (
            <>
              <div className={styles.ticketList}>
                {recentTickets.map(t => (
                  <a key={t.id} href="/tickets" className={styles.ticketRow}>
                    <code className={styles.ticketNum}>{t.ticket_number}</code>
                    <span className={styles.ticketTitle}>{t.title}</span>
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                    <span className={styles.ticketDate}>
                      {new Date(t.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </span>
                  </a>
                ))}
              </div>
              {/* Decorative vent strip */}
              <div className={styles.ventStrip} aria-hidden="true">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={styles.vent} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Side column */}
        <div className={styles.sideStack}>

          {/* Survey satisfaction panel — staff/admin only */}
          {surveyStats && (
            <div className={`${styles.panel} ${styles.surveyPanel}`}>
              <div className={styles.panelHead}>
                <span className={styles.panelTitle}>Satisfaction</span>
              </div>
              <div className={styles.surveyBody}>

                {/* Score row */}
                <div className={styles.surveyScoreRow}>
                  <div className={styles.surveyScoreWell}>
                    <span className={styles.surveyScore}>
                      {surveyStats.total === 0 ? '—' : surveyStats.avg_rating?.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <div className={styles.surveyStars}>
                      {[1,2,3,4,5].map(s => (
                        <span
                          key={s}
                          className={styles.starIcon}
                          style={{ color: s <= Math.round(surveyStats.avg_rating) ? '#f59e0b' : '#c8cdd6' }}
                        >★</span>
                      ))}
                    </div>
                    <div className={styles.surveyLabel}>Service Satisfaction</div>
                    <div className={styles.surveySub}>
                      {surveyStats.total} response{surveyStats.total !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Distribution bars — 5 → 1 */}
                <div>
                  {[5,4,3,2,1].map(star => {
                    const count = surveyStats.distribution[star] ?? 0
                    const pct   = (count / maxDist) * 100
                    return (
                      <div key={star} className={styles.distRow}>
                        <span>{star}★</span>
                        <div className={styles.distTrack}>
                          <div className={styles.distFill} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={styles.distCount}>{count}</span>
                      </div>
                    )
                  })}
                </div>

                <a href="/surveys" className={styles.surveyLinkBtn}>Full Report →</a>
              </div>

              <div className={styles.ventStrip} aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={styles.vent} />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
