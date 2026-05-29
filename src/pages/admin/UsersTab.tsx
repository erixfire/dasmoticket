import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '@/lib/adminApi'
import { api } from '@/lib/api'
import type { User, Department } from '@/types'
import {
  SkeletonTable, EmptyState, RoleBadge, Badge, toast, Spinner,
} from '@/components/ui'
import styles from './AdminTab.module.css'

const ROLES = ['employee', 'it_staff', 'admin']

export default function UsersTab() {
  const [users, setUsers]             = useState<User[]>([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading]         = useState(false)
  const [showCreate, setShowCreate]   = useState(false)
  const [editUser, setEditUser]       = useState<User | null>(null)
  const [confirmDeact, setConfirmDeact] = useState<User | null>(null)

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
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to load users')
    } finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  const handleDeactivate = async (user: User) => {
    try {
      await adminApi.users.deactivate(user.id)
      toast('success', `${user.name} has been deactivated.`)
      setConfirmDeact(null)
      load()
    } catch (e) { toast('error', e instanceof Error ? e.message : 'Failed to deactivate') }
  }

  const handleReactivate = async (user: User) => {
    try {
      await adminApi.users.update(user.id, { is_active: 1 })
      toast('success', `${user.name} has been reactivated.`)
      load()
    } catch (e) { toast('error', e instanceof Error ? e.message : 'Failed to reactivate') }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div>
      <div className={styles.toolbar}>
        <span className={styles.count}>{total} user{total !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowCreate(true)} className={styles.createBtn}>+ New User</button>
      </div>

      {loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : users.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No users found"
          description="Add the first user to get started."
          action={{ label: '+ New User', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th>
                <th>Department</th><th>Status</th><th>Joined</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={!u.is_active ? styles.rowInactive : ''}>
                  <td className={styles.nameCell}>
                    <div className={`${styles.avatar} ${!u.is_active ? styles.avatarInactive : ''}`}>
                      {u.name[0].toUpperCase()}
                    </div>
                    <span>{u.name}</span>
                  </td>
                  <td className={styles.mono}>{u.email}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>{u.department_name ?? <span className={styles.muted}>—</span>}</td>
                  <td>
                    <Badge variant={u.is_active ? 'success' : 'default'} dot>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className={styles.muted}>
                    {new Date(u.created_at).toLocaleDateString('en-PH')}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button onClick={() => setEditUser(u)} className={styles.editBtn}>Edit</button>
                      {u.is_active
                        ? <button onClick={() => setConfirmDeact(u)} className={styles.deactBtn}>Deactivate</button>
                        : <button onClick={() => handleReactivate(u)} className={styles.reactBtn}>Reactivate</button>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>← Prev</button>
          <span>Page {page} of {totalPages} &middot; {total} users</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>Next →</button>
        </div>
      )}

      {/* Deactivate confirm modal */}
      {confirmDeact && (
        <ConfirmModal
          title="Deactivate User"
          message={`Are you sure you want to deactivate ${confirmDeact.name}? They will no longer be able to log in.`}
          confirmLabel="Deactivate"
          danger
          onConfirm={() => handleDeactivate(confirmDeact)}
          onCancel={() => setConfirmDeact(null)}
        />
      )}

      {showCreate && (
        <UserFormModal
          departments={departments}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); toast('success', 'User created successfully.') }}
        />
      )}
      {editUser && (
        <UserFormModal
          user={editUser}
          departments={departments}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); load(); toast('success', 'User updated successfully.') }}
        />
      )}
    </div>
  )
}

// ─── UserFormModal ───────────────────────────────────────────

function UserFormModal({ user, departments, onClose, onSaved }: {
  user?: User; departments: Department[]
  onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!user
  const [name, setName]         = useState(user?.name ?? '')
  const [email, setEmail]       = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState(user?.role ?? 'employee')
  const [deptId, setDeptId]     = useState<number | null>(user?.department_id ?? null)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

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
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save') }
    finally { setLoading(false) }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2>{isEdit ? 'Edit User' : 'Create User'}</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.formError}>{error}</div>}
          <label className={styles.field}>Full Name *
            <input value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </label>
          {!isEdit && (
            <label className={styles.field}>Email *
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </label>
          )}
          <label className={styles.field}>
            {isEdit ? 'New Password' : 'Password *'}
            {isEdit && <span className={styles.hint}>Leave blank to keep current</span>}
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} />
          </label>
          <label className={styles.field}>Role *
            <select value={role} onChange={e => setRole(e.target.value as User['role'])}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </label>
          <label className={styles.field}>Department
            <select value={deptId ?? ''} onChange={e => setDeptId(e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">— None —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <div className={styles.formActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? <Spinner size="sm" /> : null}
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ConfirmModal ───────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel?: string
  danger?: boolean; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.confirmModal} onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <h3 className={styles.confirmTitle}>{title}</h3>
        <p className={styles.confirmMessage}>{message}</p>
        <div className={styles.confirmActions}>
          <button onClick={onCancel} className={styles.cancelBtn}>Cancel</button>
          <button
            onClick={onConfirm}
            className={danger ? styles.dangerBtn : styles.saveBtn}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
