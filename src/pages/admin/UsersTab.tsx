import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Spinner, toast } from '@/components/ui'
import styles from './AdminTabs.module.css'

type Role = 'employee' | 'it_staff' | 'admin'

interface User {
  id: number
  name: string
  email: string
  role: Role
  department?: string
  created_at: string
  is_active?: boolean
}

const ROLE_COLOR: Record<Role, string> = {
  employee: '#3498db',
  it_staff: '#2ecc71',
  admin:    '#ff4757',
}

const ROLES: Role[] = ['employee', 'it_staff', 'admin']

export default function UsersTab() {
  const [users, setUsers]       = useState<User[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')
  const [editId, setEditId]     = useState<number | null>(null)
  const [editRole, setEditRole] = useState<Role>('employee')
  const [saving, setSaving]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.users.list()
      setUsers(r.data.users ?? r.data ?? [])
    } catch { toast('error', 'Failed to load users') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const q = search.toLowerCase()
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    return matchRole && matchSearch
  })

  const startEdit = (u: User) => { setEditId(u.id); setEditRole(u.role) }
  const cancelEdit = () => setEditId(null)

  const saveRole = async (u: User) => {
    setSaving(true)
    try {
      await api.users.update(u.id, { role: editRole })
      setUsers(us => us.map(x => x.id === u.id ? { ...x, role: editRole } : x))
      toast('success', `${u.name}'s role updated to ${editRole}`)
      setEditId(null)
    } catch { toast('error', 'Failed to update role') }
    setSaving(false)
  }

  const toggleActive = async (u: User) => {
    try {
      await api.users.update(u.id, { is_active: !u.is_active })
      setUsers(us => us.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x))
      toast('success', `${u.name} ${u.is_active ? 'deactivated' : 'activated'}`)
    } catch { toast('error', 'Failed to update user') }
  }

  return (
    <div className={styles.tabContent}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWell}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filterChips}>
          {(['all', ...ROLES] as const).map(r => (
            <button
              key={r}
              className={`${styles.chip} ${roleFilter === r ? styles.chipActive : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r === 'all' ? 'All' : r.replace('_', ' ')}
            </button>
          ))}
        </div>
        <span className={styles.countBadge}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className={styles.center}><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>👥</div>
          <p>No users found</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Department</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className={u.is_active === false ? styles.rowInactive : ''}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.userAvatar} style={{ background: `${ROLE_COLOR[u.role]}22`, color: ROLE_COLOR[u.role] }}>
                        {u.name.slice(0,1).toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.userName}>{u.name}</div>
                        <div className={styles.userEmail}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {editId === u.id ? (
                      <select
                        className={styles.roleSelect}
                        value={editRole}
                        onChange={e => setEditRole(e.target.value as Role)}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                      </select>
                    ) : (
                      <span className={styles.roleBadge} style={{ background: `${ROLE_COLOR[u.role]}22`, color: ROLE_COLOR[u.role] }}>
                        {u.role.replace('_',' ')}
                      </span>
                    )}
                  </td>
                  <td className={styles.mutedCell}>{u.department ?? '—'}</td>
                  <td className={styles.mutedCell}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`${styles.statusDot} ${u.is_active === false ? styles.statusInactive : styles.statusActive}`}>
                      {u.is_active === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {editId === u.id ? (
                        <>
                          <button className={`${styles.actionBtn} ${styles.actionSave}`} onClick={() => saveRole(u)} disabled={saving}>
                            {saving ? '...' : '✓ Save'}
                          </button>
                          <button className={styles.actionBtn} onClick={cancelEdit}>×</button>
                        </>
                      ) : (
                        <>
                          <button className={styles.actionBtn} onClick={() => startEdit(u)} title="Edit role">✏️</button>
                          <button
                            className={`${styles.actionBtn} ${u.is_active === false ? styles.actionActivate : styles.actionDeactivate}`}
                            onClick={() => toggleActive(u)}
                            title={u.is_active === false ? 'Activate' : 'Deactivate'}
                          >
                            {u.is_active === false ? '▶' : '⏸'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
