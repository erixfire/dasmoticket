import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './Toast.module.css'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

const ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(toast.id), toast.duration ?? 4000)
    return () => clearTimeout(timerRef.current)
  }, [toast, onRemove])

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`} role="alert" aria-live="polite">
      <span className={styles.icon}>{ICONS[toast.type]}</span>
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.close} onClick={() => onRemove(toast.id)} aria-label="Dismiss">×</button>
    </div>
  )
}

let _addToast: ((t: Omit<ToastMessage, 'id'>) => void) | null = null

export function toast(type: ToastType, message: string, duration?: number) {
  _addToast?.({ type, message, duration })
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    _addToast = (t) => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts(prev => [...prev.slice(-4), { ...t, id }])
    }
    return () => { _addToast = null }
  }, [])

  if (!toasts.length) return null

  return (
    <div className={styles.container} aria-label="Notifications">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={remove} />
      ))}
    </div>
  )
}
