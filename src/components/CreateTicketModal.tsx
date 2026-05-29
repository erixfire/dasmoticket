import { useState, useEffect, FormEvent } from 'react'
import { api } from '@/lib/api'
import type { Department } from '@/types'
import styles from './CreateTicketModal.module.css'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const CATEGORIES = ['Hardware', 'Software', 'Network', 'Account', 'Other']
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

export default function CreateTicketModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Hardware')
  const [priority, setPriority] = useState('Medium')
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      api.departments.list().then(r => setDepartments(r.data.departments)).catch(() => {})
    }
  }, [open])

  const reset = () => {
    setTitle(''); setDescription(''); setCategory('Hardware')
    setPriority('Medium'); setDepartmentId(null); setError('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.tickets.create({ title: title.trim(), description: description.trim() || undefined, category, priority, department_id: departmentId })
      reset()
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>New Ticket</h2>
          <button onClick={handleClose} className={styles.closeBtn}>×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.field}>
            <label>Issue Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief description of the issue" required />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Priority *</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <label>Department</label>
            <select value={departmentId ?? ''} onChange={e => setDepartmentId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">-- Select Department --</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Provide more details about the issue..." />
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={handleClose} className={styles.cancelBtn}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
