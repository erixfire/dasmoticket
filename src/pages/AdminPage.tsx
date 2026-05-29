import { useState } from 'react'
import UsersTab from './admin/UsersTab'
import DepartmentsTab from './admin/DepartmentsTab'
import AuditLogsTab from './admin/AuditLogsTab'
import styles from './AdminPage.module.css'

type Tab = 'users' | 'departments' | 'audit'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'users',       label: 'Users',       icon: '👥' },
  { key: 'departments', label: 'Departments', icon: '🏢' },
  { key: 'audit',       label: 'Audit Logs',  icon: '📋' },
]

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Admin Panel</h1>
        <p className={styles.subtitle}>Manage users, departments, and system activity</p>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {tab === 'users'       && <UsersTab />}
        {tab === 'departments' && <DepartmentsTab />}
        {tab === 'audit'       && <AuditLogsTab />}
      </div>
    </div>
  )
}
