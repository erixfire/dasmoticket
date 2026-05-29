import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import styles from './Sidebar.module.css'

const NAV = [
  { to: '/dashboard',      icon: '📊', label: 'Dashboard',     roles: ['employee','it_staff','admin'] },
  { to: '/tickets',        icon: '🎫', label: 'Tickets',       roles: ['employee','it_staff','admin'] },
  { to: '/schedule',       icon: '🗓️', label: 'Schedule',      roles: ['employee','it_staff','admin'] },
  { to: '/surveys',        icon: '⭐', label: 'Satisfaction',  roles: ['it_staff','admin'] },
  { to: '/admin',          icon: '⚙️', label: 'Admin Panel',  roles: ['admin'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    // Derive unread count from in-progress / assigned tickets
    api.tickets.list({ page: '1' })
      .then(r => {
        const count = r.data.tickets.filter(
          t => t.status === 'In Progress' || (t.assigned_to && t.status === 'Open')
        ).length
        setUnread(Math.min(count, 99))
      })
      .catch(() => {})
  }, [])

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

        {/* Divider */}
        <li className={styles.navDividerWrap}>
          <div className={styles.navDivider}>
            {Array.from({ length: 5 }).map((_, i) => <span key={i} className={styles.navVent} />)}
          </div>
        </li>

        {/* Notifications bell */}
        <li>
          <NavLink
            to="/notifications"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.navIcon} style={{ position: 'relative', display: 'inline-flex' }}>
              🔔
              {unread > 0 && (
                <span className={styles.bellBadge}>{unread > 9 ? '9+' : unread}</span>
              )}
            </span>
            <span>Notifications</span>
            {unread > 0 && <span className={styles.navBadge}>{unread > 9 ? '9+' : unread}</span>}
          </NavLink>
        </li>
      </ul>

      <div className={styles.user}>
        <div className={styles.avatar}>{user?.name?.slice(0, 1).toUpperCase()}</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.name}</span>
          <span className={styles.userRole}>{user?.role?.replace('_', ' ')}</span>
        </div>
        <button onClick={logout} className={styles.logoutBtn} title="Log out">↩</button>
      </div>
    </nav>
  )
}
