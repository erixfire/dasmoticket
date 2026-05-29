import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { PageHeader, PageSpinner, EmptyState, toast } from '@/components/ui'
import styles from './SurveyStatsPage.module.css'

const STAR_LABELS: Record<number, string> = {
  5: 'Excellent', 4: 'Good', 3: 'Okay', 2: 'Poor', 1: 'Very Poor',
}
const STAR_COLORS: Record<number, string> = {
  5: '#22c55e', 4: '#84cc16', 3: '#f59e0b', 2: '#f97316', 1: '#ef4444',
}
const METRIC_ICON_BG: Record<string, string> = {
  avg:      '#6366f118',
  total:    '#6366f118',
  positive: '#22c55e18',
  negative: '#ef444418',
}

interface SurveyStats {
  avg_rating: number
  total: number
  distribution: Record<number, number>
}

export default function SurveyStatsPage() {
  const [stats, setStats]   = useState<SurveyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.surveys.stats()
      .then(res => setStats(res.data.stats))
      .catch((err: Error) => toast('error', err.message ?? 'Failed to load survey data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageSpinner />

  const maxCount   = stats ? Math.max(...Object.values(stats.distribution), 1) : 1
  const avgRounded = stats ? Math.round(stats.avg_rating * 10) / 10 : 0
  const filledStars = Math.round(avgRounded)

  const positive = stats ? (stats.distribution[4] ?? 0) + (stats.distribution[5] ?? 0) : 0
  const negative  = stats ? (stats.distribution[1] ?? 0) + (stats.distribution[2] ?? 0) : 0
  const positivePct = stats && stats.total > 0 ? Math.round((positive / stats.total) * 100) : 0
  const negativePct = stats && stats.total > 0 ? Math.round((negative / stats.total) * 100) : 0

  return (
    <div className={styles.page}>
      <PageHeader
        title="Service Satisfaction"
        subtitle="After-work survey results from resolved tickets"
      />

      {/* No data state */}
      {(!stats || stats.total === 0) && (
        <EmptyState
          icon="📊"
          title="No survey data yet"
          description="Surveys are triggered automatically when tickets are marked as Resolved. Ask IT staff to resolve tickets to start collecting feedback."
        />
      )}

      {stats && stats.total > 0 && (
        <>
          {/* Top row: score card + bar chart + ring */}
          <div className={styles.topRow}>
            {/* Score card */}
            <div className={styles.scoreCard}>
              <div className={styles.scoreNum}>
                {avgRounded.toFixed(1)}
              </div>
              <div className={styles.scoreStars}>
                {[1,2,3,4,5].map(s => (
                  <span
                    key={s}
                    className={`${styles.scoreStar} ${s <= filledStars ? styles.scoreStarFilled : ''}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <div className={styles.scoreLabel}>Average Rating</div>
              <div className={styles.scoreSub}>
                {stats.total} response{stats.total !== 1 ? 's' : ''}
              </div>
              <div className={styles.scoreTier}>{ratingTier(avgRounded)}</div>
            </div>

            {/* Bar chart */}
            <div className={styles.distCard}>
              <h3 className={styles.cardTitle}>Rating Breakdown</h3>
              <div className={styles.bars}>
                {[5,4,3,2,1].map(star => {
                  const count = stats.distribution[star] ?? 0
                  const pct   = Math.round((count / stats.total) * 100)
                  const width = `${(count / maxCount) * 100}%`
                  return (
                    <div key={star} className={styles.barRow}>
                      <div className={styles.barLabel}>
                        <span className={styles.barStar} data-rating={star}>{star}★</span>
                        <span className={styles.barLabelText}>{STAR_LABELS[star]}</span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width, background: STAR_COLORS[star] }}
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

            {/* Satisfaction ring */}
            <div className={styles.satisfactionCard}>
              <h3 className={styles.cardTitle}>Satisfaction Rate</h3>
              <SatisfactionRing pct={positivePct} />
              <p className={styles.ringCaption}>
                {positive} of {stats.total} respondent{stats.total !== 1 ? 's' : ''} rated 4★ or higher
              </p>
            </div>
          </div>

          {/* Metric cards row */}
          <div className={styles.trendRow}>
            <MetricCard
              icon="⭐"
              label="Average Score"
              value={`${avgRounded.toFixed(1)} / 5`}
              sub={ratingTier(avgRounded)}
              colorVar="--metric-avg"
              bgVar="--metric-avg-bg"
            />
            <MetricCard
              icon="📋"
              label="Total Responses"
              value={String(stats.total)}
              sub="surveys submitted"
              colorVar="--metric-total"
              bgVar="--metric-total-bg"
            />
            <MetricCard
              icon="👍"
              label="Positive (4–5 ★)"
              value={`${positivePct}%`}
              sub={`${positive} responses`}
              colorVar="--metric-positive"
              bgVar="--metric-positive-bg"
            />
            <MetricCard
              icon="👎"
              label="Negative (1–2 ★)"
              value={negativePct > 0 ? `${negativePct}%` : '—'}
              sub={`${negative} responses`}
              colorVar="--metric-negative"
              bgVar="--metric-negative-bg"
            />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────

function SatisfactionRing({ pct }: { pct: number }) {
  const r    = 56
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className={styles.ring}>
      <svg width="160" height="160" viewBox="0 0 160 160" aria-label={`${pct}% satisfied`} role="img">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#e5e7eb" strokeWidth="16" />
        <circle
          cx="80" cy="80" r={r} fill="none"
          stroke={color} strokeWidth="16"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <text x="80" y="76" textAnchor="middle" fontSize="26" fontWeight="700" fill="currentColor">
          {pct}%
        </text>
        <text x="80" y="96" textAnchor="middle" fontSize="11" fill="#94a3b8">Satisfied</text>
      </svg>
    </div>
  )
}

function MetricCard({
  icon, label, value, sub, colorVar, bgVar,
}: {
  icon: string; label: string; value: string; sub: string
  colorVar: string; bgVar: string
}) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricIcon} style={{ background: `var(${bgVar})`, color: `var(${colorVar})` }}>
        {icon}
      </div>
      <div>
        <div className={styles.metricValue} style={{ color: `var(${colorVar})` }}>{value}</div>
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
