import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import CreateTicketModal from '@/components/CreateTicketModal'
import styles from './DashboardPage.module.css'

interface Stats {
  total: number; open: number; in_progress: number; resolved_today: number; critical: number
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    api.dashboard.stats()
      .then(r => setStats(r.data.stats))
      .catch(console.error)
  }, [])

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandName}>DASMO Tickets</span>
          <span className={styles.brandSub}>Iloilo City Gov</span>
        </div>
        <nav className={styles.nav}>
          <a href="/dashboard" className={`${styles.navItem} ${styles.active}`}>📊 Dashboard</a>
          <a href="/tickets" className={styles.navItem}>🎫 Tickets</a>
          {(user?.role === 'it_staff' || user?.role === 'admin') && (
            <a href="/schedule" className={styles.navItem}>📅 Schedule</a>
          )}
          {user?.role === 'admin' && (
            <>
              <a href="/users" className={styles.navItem}>👥 Users</a>
              <a href="/reports" className={styles.navItem}>📈 Reports</a>
            </>
          )}
        </nav>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
          <div>
            <div className={styles.userName}>{user?.name}</div>
            <div className={styles.userRole}>{user?.role?.replace('_', ' ')}</div>
          </div>
          <button onClick={logout} className={styles.logoutBtn} title="Logout">⎋</button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1>Dashboard</h1>
            <p className={styles.welcome}>Welcome back, {user?.name?.split(' ')[0]} 👋</p>
          </div>
          <button onClick={() => setShowCreate(true)} className={styles.newTicketBtn}>+ New Ticket</button>
        </header>

        <div className={styles.statsGrid}>
          <StatCard label="Open Tickets" value={stats?.open ?? '—'} color="blue" icon="📥" />
          <StatCard label="In Progress" value={stats?.in_progress ?? '—'} color="yellow" icon="⏳" />
          <StatCard label="Resolved Today" value={stats?.resolved_today ?? '—'} color="green" icon="✅" />
          <StatCard label="Critical" value={stats?.critical ?? '—'} color="red" icon="🚨" />
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Quick Links</h2>
          </div>
          <div className={styles.quickLinks}>
            <a href="/tickets" className={styles.quickLink}>
              <span>🎫</span><span>View All Tickets</span>
            </a>
            <a href="/tickets?status=Open" className={styles.quickLink}>
              <span>📥</span><span>Open Tickets</span>
            </a>
            {(user?.role === 'it_staff' || user?.role === 'admin') && (
              <a href="/tickets?priority=Critical" className={styles.quickLink}>
                <span>🚨</span><span>Critical Issues</span>
              </a>
            )}
          </div>
        </section>
      </main>

      <CreateTicketModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => api.dashboard.stats().then(r => setStats(r.data.stats)).catch(() => {})}
      />
    </div>
  )
}

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: string }) {
  return (
    <div className={`${styles.statCard} ${styles['statCard--' + color]}`}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  )
}
