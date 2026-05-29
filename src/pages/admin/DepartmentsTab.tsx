import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '@/lib/adminApi'
import type { Department } from '@/types'
import styles from './AdminTab.module.css'

export default function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading]         = useState(false)
  const [showCreate, setShowCreate]   = useState(false)
  const [editDept, setEditDept]       = useState<Department | null>(null)
  const [error, setError]             = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await adminApi.departments.list(); setDepartments(res.departments) }
    catch (e) { setError(e instanceof Error ? e.message : 'Load failed') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete department "${name}"? This cannot be undone.`)) return
    try { await adminApi.departments.delete(id); load() }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  return (
    <div>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.toolbar}>
        <span className={styles.count}>{departments.length} department{departments.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowCreate(true)} className={styles.createBtn}>+ New Department</button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>#</th><th>Name</th><th>Code</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={4} className={styles.loading}>Loading...</td></tr>}
            {!loading && departments.map(d => (
              <tr key={d.id}>
                <td className={styles.muted}>{d.id}</td>
                <td><strong>{d.name}</strong></td>
                <td><code className={styles.code}>{d.code}</code></td>
                <td>
                  <div className={styles.actions}>
                    <button onClick={() => setEditDept(d)} className={styles.editBtn}>Edit</button>
                    <button onClick={() => handleDelete(d.id, d.name)} className={styles.deactBtn}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <DeptFormModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load() }} />
      )}
      {editDept && (
        <DeptFormModal dept={editDept} onClose={() => setEditDept(null)} onSaved={() => { setEditDept(null); load() }} />
      )}
    </div>
  )
}

function DeptFormModal({ dept, onClose, onSaved }: {
  dept?: Department; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!dept
  const [name, setName] = useState(dept?.name ?? '')
  const [code, setCode] = useState(dept?.code ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (isEdit) await adminApi.departments.update(dept!.id, { name, code })
      else await adminApi.departments.create({ name, code })
      onSaved()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{isEdit ? 'Edit Department' : 'New Department'}</h2>
          <button onClick={onClose} className={styles.closeBtn}>×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <label>Department Name *
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Human Resources" required />
          </label>
          <label>Code * <span style={{fontSize:'0.75rem',color:'var(--color-text-muted)'}}>uppercase, short</span>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. HR" maxLength={10} required />
          </label>
          <div className={styles.formActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
