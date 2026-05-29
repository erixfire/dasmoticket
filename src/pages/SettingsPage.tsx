import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { toast, Spinner } from '@/components/ui'
import styles from './SettingsPage.module.css'

tabs
const TABS = ['Profile', 'Security', 'Preferences'] as const
type Tab = typeof TABS[number]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Profile')

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Account Settings</h1>
        <p className={styles.subtitle}>Manage your profile, password, and preferences.</p>
      </div>

      {/* Tab bar */}
      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t}
            className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {TAB_ICON[t]} {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.body}>
        {activeTab === 'Profile'     && <ProfileTab />}
        {activeTab === 'Security'    && <SecurityTab />}
        {activeTab === 'Preferences' && <PreferencesTab />}
      </div>
    </div>
  )
}

const TAB_ICON: Record<Tab, string> = {
  Profile:     '👤',
  Security:    '🔒',
  Preferences: '⚙️',
}

// ─── Profile Tab ────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user } = useAuth()

  return (
    <div className={styles.section}>
      <div className={styles.avatarRow}>
        <div className={styles.avatar}>
          {(user?.name ?? '?')[0].toUpperCase()}
        </div>
        <div>
          <div className={styles.avatarName}>{user?.name ?? '—'}</div>
          <div className={styles.avatarRole}>{user?.role?.replace('_', ' ') ?? '—'}</div>
        </div>
      </div>

      <div className={styles.infoGrid}>
        <InfoRow label="Full Name"    value={user?.name ?? '—'} />
        <InfoRow label="Email"        value={user?.email ?? '—'} />
        <InfoRow label="Role"         value={user?.role?.replace('_', ' ') ?? '—'} />
        <InfoRow label="Department"   value={user?.department_name ?? 'Not assigned'} />
        <InfoRow label="Account ID"   value={`#${user?.id ?? '—'}`} mono />
        <InfoRow label="Status"       value={user?.is_active !== 0 ? 'Active' : 'Inactive'} />
      </div>

      <p className={styles.hint}>
        To update your name, email, or department, contact your administrator.
      </p>
    </div>
  )
}

// ─── Security Tab ────────────────────────────────────────────────────────────
function SecurityTab() {
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [showCurr, setShowCurr] = useState(false)
  const [showNext, setShowNext] = useState(false)

  const valid = current.length > 0 && next.length >= 8 && next === confirm
  const mismatch = confirm.length > 0 && next !== confirm
  const tooShort = next.length > 0 && next.length < 8

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    try {
      await api.auth.changePassword(current, next)
      toast('success', 'Password changed successfully.')
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to change password')
    } finally { setSaving(false) }
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Change Password</h2>
      <p className={styles.sectionDesc}>Use a strong password with at least 8 characters.</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <Field label="Current Password">
          <div className={styles.inputWrap}>
            <input
              type={showCurr ? 'text' : 'password'}
              className={styles.input}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter current password"
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowCurr(v => !v)}>
              {showCurr ? '🙈' : '👁️'}
            </button>
          </div>
        </Field>

        <Field label="New Password" hint={tooShort ? 'Minimum 8 characters' : undefined}>
          <div className={styles.inputWrap}>
            <input
              type={showNext ? 'text' : 'password'}
              className={`${styles.input} ${tooShort ? styles.inputError : ''}`}
              value={next}
              onChange={e => setNext(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowNext(v => !v)}>
              {showNext ? '🙈' : '👁️'}
            </button>
          </div>
          {next.length >= 8 && (
            <StrengthBar password={next} />
          )}
        </Field>

        <Field label="Confirm New Password" hint={mismatch ? 'Passwords do not match' : undefined}>
          <input
            type="password"
            className={`${styles.input} ${mismatch ? styles.inputError : ''}`}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="Re-enter new password"
          />
        </Field>

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.saveBtn}
            disabled={!valid || saving}
          >
            {saving ? <Spinner size="sm" /> : null}
            {saving ? 'Saving…' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Preferences Tab ─────────────────────────────────────────────────────────
function PreferencesTab() {
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [desktopPush, setDesktopPush] = useState(false)
  const [density,     setDensity]     = useState<'comfortable' | 'compact'>('comfortable')

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Notifications</h2>
      <div className={styles.prefList}>
        <PrefToggle
          label="Email notifications"
          description="Receive email updates when tickets are assigned or resolved."
          value={emailNotifs}
          onChange={setEmailNotifs}
        />
        <PrefToggle
          label="Desktop push notifications"
          description="Browser notifications for real-time ticket updates."
          value={desktopPush}
          onChange={setDesktopPush}
        />
      </div>

      <h2 className={styles.sectionTitle} style={{ marginTop: '2rem' }}>Display</h2>
      <div className={styles.prefList}>
        <div className={styles.prefRow}>
          <div>
            <div className={styles.prefLabel}>Table density</div>
            <div className={styles.prefDesc}>Controls row height in ticket lists.</div>
          </div>
          <div className={styles.densityGroup}>
            {(['comfortable', 'compact'] as const).map(d => (
              <button
                key={d}
                className={`${styles.densityBtn} ${density === d ? styles.densityActive : ''}`}
                onClick={() => setDensity(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className={styles.hint} style={{ marginTop: '2rem' }}>
        These preferences are saved locally. Backend preference sync coming soon.
      </p>
    </div>
  )
}

// ─── Reusable sub-components ─────────────────────────────────────────────────
function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.infoRow}>
      <dt className={styles.infoLabel}>{label}</dt>
      <dd className={`${styles.infoValue} ${mono ? styles.mono : ''}`}>{value}</dd>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
      {hint && <span className={styles.fieldHint}>{hint}</span>}
    </div>
  )
}

function PrefToggle({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className={styles.prefRow}>
      <div>
        <div className={styles.prefLabel}>{label}</div>
        <div className={styles.prefDesc}>{description}</div>
      </div>
      <button
        className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        type="button"
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  )
}

function StrengthBar({ password }: { password: string }) {
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const level = score <= 2 ? 'weak' : score <= 3 ? 'fair' : 'strong'
  const label = { weak: 'Weak', fair: 'Fair', strong: 'Strong' }[level]
  const color = { weak: '#ef4444', fair: '#f59e0b', strong: '#22c55e' }[level]
  const width = { weak: '33%', fair: '66%', strong: '100%' }[level]

  return (
    <div className={styles.strengthWrap}>
      <div className={styles.strengthTrack}>
        <div className={styles.strengthFill} style={{ width, background: color }} />
      </div>
      <span className={styles.strengthLabel} style={{ color }}>{label}</span>
    </div>
  )
}
