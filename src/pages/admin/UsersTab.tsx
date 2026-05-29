import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '@/lib/adminApi'
import { api } from '@/lib/api'
import type { User, Department } from '@/types'
import styles from './AdminTab.module.css'

const ROLES = ['employee', 'it_staff', 'admin']
const ROLE_COLORS: Record<string, string> = { admin: '#7c3aed', it_staff: '#0369a1', employee: '#374151' }
const ROLE_BG:     Record<string, string> = { admin: '#f3e8ff', it_staff: '#e0f2fe',  employee: '#f3f4f6' }

export default function UsersTab() {
  const [users, setUsers]             = useState<User[]>([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading]         = useState(false)
  const [showCreate, setShowCreate]   = useState(false)
  const [editUser, setEditUser]       = useState<User | null>(null)
  const [error, setError]             = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, dRes] = await Promise.all([
        adminApi.users.list(page),
        api.departments.list(),
      ])
      setUsers(uRes.users)
      setTotal(uRes.total)
      setDepartments(dRes.data.departments)
    } catch (e) { setError(e instanceof Error ? e.message : 'Load failed') }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  const handleDeactivate = async (id: number) => {
    if (!confirm('Deactivate this user?')) return
    try { await adminApi.users.deactivate(id); load() }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  const handleReactivate = async (id: number) => {
    try { await adminApi.users.update(id, { is_active: 1 }); load() }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.toolbar}>
        <span className={styles.count}>{total} user{total !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowCreate(true)} className={styles.createBtn}>+ New User</button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Joined</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className={styles.loading}>Loading...</td></tr>}
            {!loading && users.map(u => (
              <tr key={u.id} className={!u.is_active ? styles.rowInactive : ''}>
                <td className={styles.nameCell}>
                  <div className={styles.avatar}>{u.name[0].toUpperCase()}</div>
                  <span>{u.name}</span>
                </td>
                <td className={styles.mono}>{u.email}</td>
                <td>
                  <span className={styles.roleBadge} style={{ color: ROLE_COLORS[u.role], background: ROLE_BG[u.role] }}>
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td>{u.department_name ?? <span className={styles.muted}>—</span>}</td>
                <td>
                  <span className={`${styles.statusDot} ${u.is_active ? styles.dotActive : styles.dotInactive}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className={styles.muted}>{new Date(u.created_at).toLocaleDateString('en-PH')}</td>
                <td>
                  <div className={styles.actions}>
                    <button onClick={() => setEditUser(u)} className={styles.editBtn}>Edit</button>
                    {u.is_active
                      ? <button onClick={() => handleDeactivate(u.id)} className={styles.deactBtn}>Deactivate</button>
                      : <button onClick={() => handleReactivate(u.id)} className={styles.reactBtn}>Reactivate</button>
                    }
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>&larr; Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>Next &rarr;</button>
        </div>
      )}

      {showCreate && (
        <UserFormModal
          departments={departments}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load() }}
        />
      )}
      {editUser && (
        <UserFormModal
          user={editUser}
          departments={departments}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); load() }}
        />
      )}
    </div>
  )
}

function UserFormModal({ user, departments, onClose, onSaved }: {
  user?: User; departments: Department[]
  onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!user
  const [name, setName]       = useState(user?.name ?? '')
  const [email, setEmail]     = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole]       = useState(user?.role ?? 'employee')
  const [deptId, setDeptId]   = useState<number | null>(user?.department_id ?? null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (isEdit) {
        const payload: Record<string, unknown> = { name, role, department_id: deptId }
        if (password) payload.new_password = password
        await adminApi.users.update(user!.id, payload)
      } else {
        if (!password) { setError('Password is required'); setLoading(false); return }
        await adminApi.users.create({ name, email, password, role, department_id: deptId })
      }
      onSaved()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{isEdit ? 'Edit User' : 'Create User'}</h2>
          <button onClick={onClose} className={styles.closeBtn}>×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <label>Full Name *
            <input value={name} onChange={e => setName(e.target.value)} required />
          </label>
          {!isEdit && (
            <label>Email *
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </label>
          )}
          <label>{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <label>Role *
            <select value={role} onChange={e => setRole(e.target.value as User['role'])}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
            </select>
          </label>
          <label>Department
            <select value={deptId ?? ''} onChange={e => setDeptId(e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">— None —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <div className={styles.formActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
