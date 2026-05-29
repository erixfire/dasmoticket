import { useAuth } from '@/context/AuthContext'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandName}>DASMO Tickets</span>
          <span className={styles.brandSub}>Iloilo City Gov</span>
        </div>
        <nav className={styles.nav}>
          <a href="/dashboard" className={styles.navItem + ' ' + styles.active}>📊 Dashboard</a>
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
          <h1>Dashboard</h1>
          <a href="/tickets/new" className={styles.newTicketBtn}>+ New Ticket</a>
        </header>
        <div className={styles.statsGrid}>
          <StatCard label="Open Tickets" value="—" color="blue" />
          <StatCard label="In Progress" value="—" color="yellow" />
          <StatCard label="Resolved Today" value="—" color="green" />
          <StatCard label="Critical" value="—" color="red" />
        </div>
        <section className={styles.section}>
          <h2>Recent Tickets</h2>
          <p className={styles.placeholder}>Ticket data will load here once the API is connected.</p>
        </section>
      </main>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`${styles.statCard} ${styles['statCard--' + color]}`}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  )
}
