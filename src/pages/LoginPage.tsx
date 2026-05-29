import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import styles from './LoginPage.module.css'

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
      {/* Noise texture overlay */}
      <div className={styles.noise} aria-hidden="true" />

      {/* Left panel — brand identity */}
      <div className={styles.brand}>
        <div className={styles.brandInner}>
          {/* Status LED */}
          <div className={styles.statusBadge}>
            <span className={styles.led} aria-hidden="true" />
            <span className={styles.statusText}>SYSTEM ONLINE</span>
          </div>

          {/* Logo */}
          <div className={styles.logoWell}>
            <img
              src="/dasmo-logo.png"
              alt="DASMO"
              className={styles.logoImg}
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          </div>

          <h1 className={styles.brandTitle}>DASMO</h1>
          <p className={styles.brandSubtitle}>Ticket Management System</p>

          <div className={styles.divider} aria-hidden="true" />

          <p className={styles.brandDept}>Iloilo City Government</p>
          <p className={styles.brandUnit}>Department of Administrative Services &amp; Management Office</p>

          {/* Decorative vent slots */}
          <div className={styles.vents} aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.ventSlot} />
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login module */}
      <div className={styles.module}>
        {/* Corner screws */}
        <div className={styles.screw} data-pos="tl" aria-hidden="true" />
        <div className={styles.screw} data-pos="tr" aria-hidden="true" />
        <div className={styles.screw} data-pos="bl" aria-hidden="true" />
        <div className={styles.screw} data-pos="br" aria-hidden="true" />

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
