import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '@/lib/adminApi'
import type { Department } from '@/types'
import { SkeletonTable, EmptyState, Badge, toast, Spinner } from '@/components/ui'
import styles from './AdminTab.module.css'

export default function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading]         = useState(false)
  const [showCreate, setShowCreate]   = useState(false)
  const [editDept, setEditDept]       = useState<Department | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Department | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.departments.list()
      setDepartments(res.departments)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to load departments')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (dept: Department) => {
    try {
      await adminApi.departments.delete(dept.id)
      toast('success', `Department "${dept.name}" deleted.`)
      setConfirmDelete(null)
      load()
    } catch (e) { toast('error', e instanceof Error ? e.message : 'Failed to delete') }
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <span className={styles.count}>{departments.length} department{departments.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowCreate(true)} className={styles.createBtn}>+ New Department</button>
      </div>

      {loading ? (
        <SkeletonTable rows={4} cols={3} />
      ) : departments.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="No departments yet"
          description="Add departments to organize users and tickets."
          action={{ label: '+ New Department', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>#</th><th>Name</th><th>Code</th><th>Users</th><th></th></tr>
            </thead>
            <tbody>
              {departments.map(d => (
                <tr key={d.id}>
                  <td className={styles.muted}>{d.id}</td>
                  <td><strong>{d.name}</strong></td>
                  <td><Badge variant="info">{d.code}</Badge></td>
                  <td className={styles.muted}>{(d as Department & { user_count?: number }).user_count ?? '—'}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button onClick={() => setEditDept(d)} className={styles.editBtn}>Edit</button>
                      <button onClick={() => setConfirmDelete(d)} className={styles.deactBtn}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Department"
          message={`Delete "${confirmDelete.name}"? This cannot be undone and may affect assigned users.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showCreate && (
        <DeptFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); toast('success', 'Department created.') }}
        />
      )}
      {editDept && (
        <DeptFormModal
          dept={editDept}
          onClose={() => setEditDept(null)}
          onSaved={() => { setEditDept(null); load(); toast('success', 'Department updated.') }}
        />
      )}
    </div>
  )
}

function DeptFormModal({ dept, onClose, onSaved }: {
  dept?: Department; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!dept
  const [name, setName]       = useState(dept?.name ?? '')
  const [code, setCode]       = useState(dept?.code ?? '')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (isEdit) await adminApi.departments.update(dept!.id, { name, code })
      else await adminApi.departments.create({ name, code })
      onSaved()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save') }
    finally { setLoading(false) }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2>{isEdit ? 'Edit Department' : 'New Department'}</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.formError}>{error}</div>}
          <label className={styles.field}>Department Name *
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Human Resources" required autoFocus />
          </label>
          <label className={styles.field}>
            Code *
            <span className={styles.hint}>Uppercase abbreviation, max 10 chars</span>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. HR"
              maxLength={10}
              required
            />
          </label>
          <div className={styles.formActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? <Spinner size="sm" /> : null}
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
          <button onClick={onConfirm} className={danger ? styles.dangerBtn : styles.saveBtn} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
