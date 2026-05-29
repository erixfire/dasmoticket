import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import styles from './Sidebar.module.css'

const NAV = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard', roles: ['employee','it_staff','admin'] },
  { to: '/tickets',   icon: '🎫', label: 'Tickets',   roles: ['employee','it_staff','admin'] },
  { to: '/schedule',  icon: '🗓️', label: 'Schedule',   roles: ['employee','it_staff','admin'] },
  { to: '/surveys',   icon: '⭐', label: 'Satisfaction', roles: ['it_staff','admin'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const visibleNav = NAV.filter(n => user && n.roles.includes(user.role))

  return (
    <nav className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>🎫</span>
        <span className={styles.brandText}>DasmoTicket</span>
      </div>

      <ul className={styles.nav}>
        {visibleNav.map(({ to, icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{icon}</span>
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className={styles.user}>
        <div className={styles.avatar}>{user?.name?.slice(0, 1).toUpperCase()}</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.name}</span>
          <span className={styles.userRole}>{user?.role?.replace('_', ' ')}</span>
        </div>
        <button onClick={logout} className={styles.logoutBtn} title="Log out">
          ↩
        </button>
      </div>
    </nav>
  )
}
