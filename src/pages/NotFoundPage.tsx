import { useNavigate } from 'react-router-dom'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.code}>404</div>
        <div className={styles.glitch} aria-hidden>404</div>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.desc}>
          The page you’re looking for doesn’t exist or was moved.
        </p>
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={() => navigate('/dashboard')}>
            📊 Go to Dashboard
          </button>
          <button className={styles.secondaryBtn} onClick={() => navigate(-1)}>
            ← Go back
          </button>
        </div>
        <div className={styles.ventStrip}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className={styles.vent} />)}
        </div>
      </div>
    </div>
  )
}
