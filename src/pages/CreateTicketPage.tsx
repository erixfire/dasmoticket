import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Department } from '@/types'
import { Spinner, toast } from '@/components/ui'
import styles from './CreateTicketPage.module.css'

const CATEGORIES = ['Hardware', 'Software', 'Network', 'Account', 'Other'] as const
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const

const PRIORITY_META: Record<string, { color: string; desc: string }> = {
  Low:      { color: '#16a34a', desc: 'Non-urgent, can wait' },
  Medium:   { color: '#d97706', desc: 'Affects work but has workaround' },
  High:     { color: '#ea580c', desc: 'Significantly impacts operations' },
  Critical: { color: '#ff4757', desc: 'System down, immediate action needed' },
}

export default function CreateTicketPage() {
  const navigate = useNavigate()

  const [departments, setDepartments] = useState<Department[]>([])
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory]       = useState<typeof CATEGORIES[number]>('Software')
  const [priority, setPriority]       = useState<typeof PRIORITIES[number]>('Medium')
  const [deptId, setDeptId]           = useState<number | null>(null)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [loadingDepts, setLoadingDepts] = useState(true)

  useEffect(() => {
    api.departments.list()
      .then(r => setDepartments(r.data.departments))
      .catch(() => {})
      .finally(() => setLoadingDepts(false))
  }, [])

  const isValid = title.trim().length >= 3

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setError(''); setLoading(true)
    try {
      const res = await api.tickets.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        department_id: deptId,
      })
      toast('success', 'Ticket created successfully!')
      navigate(`/tickets/${res.data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create ticket')
    } finally { setLoading(false) }
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/tickets')} type="button">
          ← Back
        </button>
        <div>
          <h1 className={styles.pageTitle}>New Ticket</h1>
          <p className={styles.pageSubtitle}>Describe your issue and we'll get it to the right team.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {error && <div className={styles.formError}>{error}</div>}

        {/* ── Section 1: Classification ── */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>Classification</div>
          <div className={styles.row}>
            {/* Category */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Category *</label>
              <div className={styles.chipGrid}>
                {CATEGORIES.map(c => (
                  <button
                    key={c} type="button"
                    className={`${styles.chipBtn} ${category === c ? styles.chipActive : ''}`}
                    onClick={() => setCategory(c)}
                  >{c}</button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Priority *</label>
              <div className={styles.priorityGrid}>
                {PRIORITIES.map(p => (
                  <button
                    key={p} type="button"
                    className={`${styles.priorityBtn} ${priority === p ? styles.priorityActive : ''}`}
                    style={priority === p ? { color: PRIORITY_META[p].color, borderColor: PRIORITY_META[p].color } : {}}
                    onClick={() => setPriority(p)}
                  >
                    <span
                      className={styles.priorityDot}
                      style={{ background: PRIORITY_META[p].color }}
                    />
                    {p}
                  </button>
                ))}
              </div>
              {priority && (
                <p className={styles.priorityDesc}>{PRIORITY_META[priority].desc}</p>
              )}
            </div>
          </div>

          {/* Department */}
          <div className={styles.fieldGroup} style={{ marginTop: '1rem' }}>
            <label className={styles.fieldLabel}>Department</label>
            {loadingDepts ? (
              <div className={styles.deptLoading}><Spinner size="sm" /></div>
            ) : (
              <select
                className={styles.select}
                value={deptId ?? ''}
                onChange={e => setDeptId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— Not sure / General —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* ── Section 2: Issue Details ── */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>Issue Details</div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="ticket-title">
              Subject *
              <span className={styles.charCount}>{title.length}/120</span>
            </label>
            <input
              id="ticket-title"
              className={`${styles.input} ${title.length > 0 && title.length < 3 ? styles.inputError : ''}`}
              type="text"
              placeholder="Brief summary of the issue…"
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 120))}
              autoFocus
              required
            />
            {title.length > 0 && title.length < 3 && (
              <p className={styles.fieldError}>Title must be at least 3 characters</p>
            )}
          </div>

          <div className={styles.fieldGroup} style={{ marginTop: '1rem' }}>
            <label className={styles.fieldLabel} htmlFor="ticket-desc">
              Description
              <span className={styles.optional}>optional</span>
            </label>
            <textarea
              id="ticket-desc"
              className={styles.textarea}
              placeholder="Provide steps to reproduce, error messages, affected systems, etc."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={6}
            />
          </div>
        </div>

        {/* ── Section 3: Drop zone placeholder ── */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>Attachments <span className={styles.optional}>coming soon</span></div>
          <div className={styles.dropZone}>
            <div className={styles.dropIcon}>📎</div>
            <p className={styles.dropText}>Drag &amp; drop files here</p>
            <p className={styles.dropSub}>Screenshots, logs, documents — up to 10 MB each</p>
          </div>
        </div>

        {/* ── Sticky action bar ── */}
        <div className={styles.actionBar}>
          <div className={styles.actionBarInner}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => navigate('/tickets')}
            >Cancel</button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!isValid || loading}
            >
              {loading ? <Spinner size="sm" /> : null}
              {loading ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
