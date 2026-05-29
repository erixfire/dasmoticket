import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import styles from './LoginPage.module.css'

// Iloilo City official seal — inline SVG, no external asset dependency
function IloiloCitySeal({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="Iloilo City official seal"
    >
      {/* Outer ring */}
      <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.7" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />

      {/* Ring text path */}
      <defs>
        <path id="topArc" d="M 20,100 A 80,80 0 0,1 180,100" />
        <path id="btmArc" d="M 22,108 A 80,80 0 0,0 178,108" />
      </defs>
      <text fontSize="11" fontWeight="700" letterSpacing="3" fill="currentColor" fontFamily="'JetBrains Mono', monospace">
        <textPath href="#topArc" startOffset="8%">ILOILO CITY GOVERNMENT</textPath>
      </text>
      <text fontSize="9" fontWeight="500" letterSpacing="2" fill="currentColor" fontFamily="'JetBrains Mono', monospace" opacity="0.75">
        <textPath href="#btmArc" startOffset="18%">WESTERN VISAYAS • PHILIPPINES</textPath>
      </text>

      {/* Shield body */}
      <path
        d="M100 38 L140 52 L148 90 Q148 130 100 158 Q52 130 52 90 L60 52 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.8"
      />

      {/* Shield inner — wave (Iloilo River / sea) */}
      <path
        d="M60 105 Q70 98 80 105 Q90 112 100 105 Q110 98 120 105 Q130 112 140 105"
        fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"
      />
      <path
        d="M60 115 Q70 108 80 115 Q90 122 100 115 Q110 108 120 115 Q130 122 140 115"
        fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"
      />

      {/* Shield upper — sun rays */}
      <circle cx="100" cy="78" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.85" />
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = Math.PI * deg / 180
        const x1 = 100 + 13 * Math.cos(r)
        const y1 = 78  + 13 * Math.sin(r)
        const x2 = 100 + 20 * Math.cos(r)
        const y2 = 78  + 20 * Math.sin(r)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      })}

      {/* Stars — 3 under the wave (representing 3 stars of Visayas) */}
      {[-18, 0, 18].map((offset, i) => (
        <text key={i} x={100 + offset} y="144" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.7">★</text>
      ))}

      {/* Center dot */}
      <circle cx="100" cy="100" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  if (user) { navigate('/dashboard', { replace: true }); return null }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.chassis}>
      <div className={styles.noise} aria-hidden="true" />

      {/* ── Left panel: brand identity ── */}
      <div className={styles.brand}>
        <div className={styles.brandInner}>

          {/* Status LED */}
          <div className={styles.statusBadge}>
            <span className={styles.led} aria-hidden="true" />
            <span className={styles.statusText}>SYSTEM ONLINE</span>
          </div>

          {/* Iloilo City Seal */}
          <div className={styles.sealWell}>
            <IloiloCitySeal className={styles.sealSvg} />
          </div>

          {/* Office identity */}
          <p className={styles.cityLabel}>Iloilo City Government</p>
          <h1 className={styles.brandTitle}>DASMO</h1>
          <p className={styles.brandFull}>Data Assessment and Systems<br />Management Office</p>

          <div className={styles.divider} aria-hidden="true" />

          <p className={styles.brandUnit}>
            IT Support &amp; Ticket Management System
          </p>

          {/* Decorative vent slots */}
          <div className={styles.vents} aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.ventSlot} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: login module ── */}
      <div className={styles.module}>
        {/* Corner screws */}
        <div className={styles.screw} data-pos="tl" aria-hidden="true" />
        <div className={styles.screw} data-pos="tr" aria-hidden="true" />
        <div className={styles.screw} data-pos="bl" aria-hidden="true" />
        <div className={styles.screw} data-pos="br" aria-hidden="true" />

        {/* Mobile-only seal + title */}
        <div className={styles.mobileHeader}>
          <IloiloCitySeal className={styles.mobileSeal} />
          <div>
            <p className={styles.mobileCityLabel}>Iloilo City Government</p>
            <p className={styles.mobileOffice}>DASMO</p>
          </div>
        </div>

        <div className={styles.moduleHeader}>
          <span className={styles.moduleLabel}>AUTH TERMINAL</span>
          <span className={styles.moduleId}>v2.4.1</span>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {error && (
            <div className={styles.errorBanner} role="alert">
              <span className={styles.errorDot} aria-hidden="true" />
              {error}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>EMAIL ADDRESS</label>
            <div className={styles.inputWell}>
              <span className={styles.inputPrefix} aria-hidden="true">&gt;</span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@iloilocity.gov.ph"
                className={styles.input}
                required
                autoFocus
                autoComplete="email"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>PASSWORD</label>
            <div className={styles.inputWell}>
              <span className={styles.inputPrefix} aria-hidden="true">&gt;</span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <><span className={styles.spinner} aria-hidden="true" />AUTHENTICATING...</>
            ) : (
              'SIGN IN'
            )}
          </button>
        </form>

        <p className={styles.footNote}>
          Authorized personnel only. All sessions are logged.
        </p>
      </div>
    </div>
  )
}
