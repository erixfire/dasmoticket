import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import styles from './SurveyStatsPage.module.css'

const STAR_LABELS: Record<number, string> = { 5: 'Excellent', 4: 'Good', 3: 'Okay', 2: 'Poor', 1: 'Very Poor' }
const STAR_COLORS: Record<number, string> = { 5: '#22c55e', 4: '#84cc16', 3: '#f59e0b', 2: '#f97316', 1: '#ef4444' }

interface SurveyStats {
  avg_rating: number
  total: number
  distribution: Record<number, number>
}

export default function SurveyStatsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<SurveyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.surveys.stats()
      .then(res => setStats(res.data.stats))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading survey data...</div></div>
  if (error) return <div className={styles.page}><div className={styles.error}>{error}</div></div>
  if (!stats) return null

  const maxCount = Math.max(...Object.values(stats.distribution), 1)
  const avgRounded = Math.round(stats.avg_rating * 10) / 10
  const filledStars = Math.round(avgRounded)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Service Satisfaction</h1>
        <p className={styles.subtitle}>After-work survey results from resolved tickets</p>
      </div>

      <div className={styles.topRow}>
        {/* Big average score card */}
        <div className={styles.scoreCard}>
          <div className={styles.scoreNum}>{stats.total === 0 ? '—' : avgRounded.toFixed(1)}</div>
          <div className={styles.scoreStars}>
            {[1,2,3,4,5].map(s => (
              <span key={s} className={`${styles.scoreStar} ${s <= filledStars ? styles.scoreStarFilled : ''}`}>★</span>
            ))}
          </div>
          <div className={styles.scoreLabel}>Average Rating</div>
          <div className={styles.scoreSub}>{stats.total} response{stats.total !== 1 ? 's' : ''}</div>
        </div>

        {/* Distribution bar chart */}
        <div className={styles.distCard}>
          <h3 className={styles.cardTitle}>Rating Breakdown</h3>
          <div className={styles.bars}>
            {[5,4,3,2,1].map(star => {
              const count = stats.distribution[star] ?? 0
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
              const barWidth = stats.total > 0 ? `${(count / maxCount) * 100}%` : '0%'
              return (
                <div key={star} className={styles.barRow}>
                  <div className={styles.barLabel}>
                    <span style={{ color: STAR_COLORS[star], fontWeight: 700 }}>{star}★</span>
                    <span className={styles.barLabelText}>{STAR_LABELS[star]}</span>
                  </div>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: barWidth, background: STAR_COLORS[star] }}
                    />
                  </div>
                  <div className={styles.barStats}>
                    <span className={styles.barCount}>{count}</span>
                    <span className={styles.barPct}>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Donut-style satisfaction rate */}
        <div className={styles.satisfactionCard}>
          <h3 className={styles.cardTitle}>Satisfaction Rate</h3>
          <SatisfactionRing stats={stats} />
        </div>
      </div>

      {/* Trend cards row */}
      <div className={styles.trendRow}>
        <MetricCard
          icon="⭐"
          label="Average Score"
          value={stats.total === 0 ? 'N/A' : `${avgRounded.toFixed(1)} / 5`}
          sub={stats.total === 0 ? 'No responses yet' : ratingTier(avgRounded)}
          color={avgRounded >= 4 ? '#22c55e' : avgRounded >= 3 ? '#f59e0b' : '#ef4444'}
        />
        <MetricCard
          icon="📋"
          label="Total Responses"
          value={String(stats.total)}
          sub="surveys submitted"
          color="#6366f1"
        />
        <MetricCard
          icon="👍"
          label="Positive (4–5 ★)"
          value={stats.total > 0 ? `${Math.round(((stats.distribution[4] ?? 0) + (stats.distribution[5] ?? 0)) / stats.total * 100)}%` : '—'}
          sub={`${(stats.distribution[4] ?? 0) + (stats.distribution[5] ?? 0)} responses`}
          color="#22c55e"
        />
        <MetricCard
          icon="👎"
          label="Negative (1–2 ★)"
          value={stats.total > 0 ? `${Math.round(((stats.distribution[1] ?? 0) + (stats.distribution[2] ?? 0)) / stats.total * 100)}%` : '—'}
          sub={`${(stats.distribution[1] ?? 0) + (stats.distribution[2] ?? 0)} responses`}
          color="#ef4444"
        />
      </div>

      {stats.total === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <h3>No survey data yet</h3>
          <p>Surveys are triggered automatically when tickets are marked as Resolved.<br />Ask IT staff to resolve tickets to start collecting feedback.</p>
        </div>
      )}
    </div>
  )
}

// SVG donut ring component
function SatisfactionRing({ stats }: { stats: SurveyStats }) {
  const positive = (stats.distribution[4] ?? 0) + (stats.distribution[5] ?? 0)
  const pct = stats.total > 0 ? Math.round((positive / stats.total) * 100) : 0
  const r = 56
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className={styles.ring}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#e5e7eb" strokeWidth="16" />
        <circle
          cx="80" cy="80" r={r}
          fill="none"
          stroke={pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'}
          strokeWidth="16"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="80" y="76" textAnchor="middle" fontSize="26" fontWeight="700" fill="currentColor">{pct}%</text>
        <text x="80" y="96" textAnchor="middle" fontSize="11" fill="#94a3b8">Satisfied</text>
      </svg>
    </div>
  )
}

function MetricCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricIcon} style={{ background: `${color}18`, color }}>{icon}</div>
      <div>
        <div className={styles.metricValue} style={{ color }}>{value}</div>
        <div className={styles.metricLabel}>{label}</div>
        <div className={styles.metricSub}>{sub}</div>
      </div>
    </div>
  )
}

function ratingTier(avg: number): string {
  if (avg >= 4.5) return 'Exceptional service'
  if (avg >= 4.0) return 'Good service'
  if (avg >= 3.0) return 'Acceptable service'
  if (avg >= 2.0) return 'Needs improvement'
  return 'Poor service'
}
