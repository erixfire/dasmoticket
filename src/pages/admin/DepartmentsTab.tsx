import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Spinner, toast } from '@/components/ui'
import styles from './AdminTabs.module.css'

interface Department {
  id: number
  name: string
  head?: string
  staff_count?: number
  open_tickets?: number
  created_at: string
}

export default function DepartmentsTab() {
  const [depts, setDepts]       = useState<Department[]>([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')
  const [newHead, setNewHead]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [editId, setEditId]     = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.departments.list()
      setDepts(r.data.departments ?? r.data ?? [])
    } catch { toast('error', 'Failed to load departments') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const r = await api.departments.create({ name: newName.trim(), head: newHead.trim() || undefined })
      setDepts(d => [...d, r.data.department ?? r.data])
      toast('success', `Department "${newName.trim()}" created`)
      setNewName(''); setNewHead(''); setCreating(false)
    } catch { toast('error', 'Failed to create department') }
    setSaving(false)
  }

  const handleRename = async (d: Department) => {
    if (!editName.trim() || editName.trim() === d.name) { setEditId(null); return }
    setSaving(true)
    try {
      await api.departments.update(d.id, { name: editName.trim() })
      setDepts(ds => ds.map(x => x.id === d.id ? { ...x, name: editName.trim() } : x))
      toast('success', 'Department renamed')
      setEditId(null)
    } catch { toast('error', 'Failed to rename') }
    setSaving(false)
  }

  const handleDelete = async (d: Department) => {
    if (!window.confirm(`Delete department "${d.name}"? This cannot be undone.`)) return
    try {
      await api.departments.delete(d.id)
      setDepts(ds => ds.filter(x => x.id !== d.id))
      toast('success', `"${d.name}" deleted`)
    } catch { toast('error', 'Failed to delete department') }
  }

  return (
    <div className={styles.tabContent}>
      {/* Header toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.countBadge}>{depts.length} department{depts.length !== 1 ? 's' : ''}</span>
        <button className={styles.createBtn} onClick={() => setCreating(c => !c)}>
          {creating ? '× Cancel' : '+ New Department'}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className={styles.createCard}>
          <h3 className={styles.createTitle}>New Department</h3>
          <div className={styles.createRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Name <span className={styles.required}>*</span></label>
              <input
                className={styles.fieldInput}
                placeholder="e.g. Human Resources"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Department Head</label>
              <input
                className={styles.fieldInput}
                placeholder="Name of head (optional)"
                value={newHead}
                onChange={e => setNewHead(e.target.value)}
              />
            </div>
            <button
              className={`${styles.actionBtn} ${styles.actionSave}`}
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              style={{ alignSelf: 'flex-end', height: 40, padding: '0 1.25rem' }}
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Dept grid */}
      {loading ? (
        <div className={styles.center}><Spinner size="lg" /></div>
      ) : depts.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🏢</div>
          <p>No departments yet. Create one above.</p>
        </div>
      ) : (
        <div className={styles.deptGrid}>
          {depts.map(d => (
            <div key={d.id} className={styles.deptCard}>
              <div className={styles.deptCardHeader}>
                <div className={styles.deptIconWell}>🏢</div>
                <div className={styles.deptMeta}>
                  {editId === d.id ? (
                    <input
                      className={styles.inlineInput}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(d); if (e.key === 'Escape') setEditId(null) }}
                      autoFocus
                    />
                  ) : (
                    <div className={styles.deptName}>{d.name}</div>
                  )}
                  {d.head && <div className={styles.deptHead}>Head: {d.head}</div>}
                </div>
              </div>
              <div className={styles.deptStats}>
                <div className={styles.deptStat}>
                  <span className={styles.deptStatVal}>{d.staff_count ?? '—'}</span>
                  <span className={styles.deptStatLabel}>Staff</span>
                </div>
                <div className={styles.deptStat}>
                  <span className={styles.deptStatVal}>{d.open_tickets ?? '—'}</span>
                  <span className={styles.deptStatLabel}>Open Tickets</span>
                </div>
                <div className={styles.deptStat}>
                  <span className={styles.deptStatVal}>{new Date(d.created_at).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}</span>
                  <span className={styles.deptStatLabel}>Created</span>
                </div>
              </div>
              <div className={styles.deptActions}>
                {editId === d.id ? (
                  <>
                    <button className={`${styles.actionBtn} ${styles.actionSave}`} onClick={() => handleRename(d)} disabled={saving}>{saving ? '...' : '✓ Rename'}</button>
                    <button className={styles.actionBtn} onClick={() => setEditId(null)}>×</button>
                  </>
                ) : (
                  <>
                    <button className={styles.actionBtn} onClick={() => { setEditId(d.id); setEditName(d.name) }}>✏️ Rename</button>
                    <button className={`${styles.actionBtn} ${styles.actionDeactivate}`} onClick={() => handleDelete(d)}>🗑 Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
