import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Spinner, toast } from '@/components/ui'
import styles from './NotificationsPage.module.css'

export type NotifType = 'ticket_assigned' | 'status_changed' | 'note_added' | 'ticket_created' | 'ticket_resolved'

export interface Notification {
  id: string
  type: NotifType
  title: string
  body: string
  ticket_id?: number
  ticket_number?: string
  read: boolean
  created_at: string
}

const TYPE_ICON: Record<NotifType, string> = {
  ticket_assigned:  '📌',
  status_changed:   '🔄',
  note_added:       '💬',
  ticket_created:   '🎫',
  ticket_resolved:  '✅',
}

const TYPE_LABEL: Record<NotifType, string> = {
  ticket_assigned:  'Assigned',
  status_changed:   'Status',
  note_added:       'Note',
  ticket_created:   'New Ticket',
  ticket_resolved:  'Resolved',
}

// Build notifications from real ticket activity (audit-log style from recent tickets)
async function fetchNotifications(): Promise<Notification[]> {
  try {
    const res = await api.tickets.list({ page: '1' })
    const tickets = res.data.tickets.slice(0, 20)
    const notifs: Notification[] = []

    tickets.forEach(t => {
      if (t.assigned_to) {
        notifs.push({
          id: `assigned-${t.id}`,
          type: 'ticket_assigned',
          title: 'Ticket assigned',
          body: `#${t.ticket_number} · ${t.title} was assigned to ${t.assigned_name ?? 'someone'}.`,
          ticket_id: t.id,
          ticket_number: t.ticket_number,
          read: t.status === 'Resolved' || t.status === 'Closed',
          created_at: t.updated_at,
        })
      }
      if (t.status === 'In Progress') {
        notifs.push({
          id: `status-${t.id}`,
          type: 'status_changed',
          title: 'Status updated',
          body: `#${t.ticket_number} · ${t.title} is now In Progress.`,
          ticket_id: t.id,
          ticket_number: t.ticket_number,
          read: false,
          created_at: t.updated_at,
        })
      }
      if (t.status === 'Resolved' || t.status === 'Closed') {
        notifs.push({
          id: `resolved-${t.id}`,
          type: 'ticket_resolved',
          title: 'Ticket resolved',
          body: `#${t.ticket_number} · ${t.title} has been resolved.`,
          ticket_id: t.id,
          ticket_number: t.ticket_number,
          read: true,
          created_at: t.resolved_at ?? t.updated_at,
        })
      }
      notifs.push({
        id: `created-${t.id}`,
        type: 'ticket_created',
        title: 'Ticket created',
        body: `#${t.ticket_number} · ${t.title} was submitted by ${t.requester_name ?? 'you'}.`,
        ticket_id: t.id,
        ticket_number: t.ticket_number,
        read: true,
        created_at: t.created_at,
      })
    })

    return notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch {
    return []
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifs, setNotifs]     = useState<Notification[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all' | 'unread'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchNotifications()
    setNotifs(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const markAllRead = () => {
    setNotifs(n => n.map(x => ({ ...x, read: true })))
    toast('success', 'All notifications marked as read')
  }

  const markRead = (id: string) => {
    setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x))
  }

  const handleClick = (n: Notification) => {
    markRead(n.id)
    if (n.ticket_id) navigate(`/tickets/${n.ticket_id}`)
  }

  const visible = filter === 'unread' ? notifs.filter(n => !n.read) : notifs
  const unreadCount = notifs.filter(n => !n.read).length

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>
            <span className={styles.bellIcon}>🔔</span>
            Notifications
          </h1>
          <p className={styles.pageSubtitle}>Your activity feed — ticket updates, assignments, and notes.</p>
        </div>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${filter === 'all' ? styles.tabActive : ''}`}
          onClick={() => setFilter('all')}
        >
          All
          <span className={styles.tabCount}>{notifs.length}</span>
        </button>
        <button
          className={`${styles.tab} ${filter === 'unread' ? styles.tabActive : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread
          {unreadCount > 0 && (
            <span className={`${styles.tabCount} ${styles.tabCountUnread}`}>{unreadCount}</span>
          )}
        </button>
      </div>

      {/* Feed */}
      <div className={styles.feed}>
        {loading ? (
          <div className={styles.loadingWrap}><Spinner size="lg" /></div>
        ) : visible.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🎉</div>
            <p className={styles.emptyTitle}>{filter === 'unread' ? 'All caught up!' : 'No notifications yet'}</p>
            <p className={styles.emptyBody}>{filter === 'unread' ? 'No unread notifications.' : 'Ticket activity will show up here.'}</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {visible.map(n => (
              <li
                key={n.id}
                className={`${styles.item} ${!n.read ? styles.unread : ''}`}
                onClick={() => handleClick(n)}
                tabIndex={0}
                role="button"
                onKeyDown={e => e.key === 'Enter' && handleClick(n)}
                aria-label={n.title}
              >
                <div className={styles.itemIconWell}>
                  <span className={styles.itemIcon}>{TYPE_ICON[n.type]}</span>
                </div>
                <div className={styles.itemBody}>
                  <div className={styles.itemTop}>
                    <span className={styles.itemType}>{TYPE_LABEL[n.type]}</span>
                    {n.ticket_number && (
                      <span className={styles.itemTicket}>#{n.ticket_number}</span>
                    )}
                    <span className={styles.itemTime}>{relTime(n.created_at)}</span>
                  </div>
                  <p className={styles.itemTitle}>{n.title}</p>
                  <p className={styles.itemDesc}>{n.body}</p>
                </div>
                {!n.read && <div className={styles.unreadDot} aria-label="Unread" />}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Vent strip */}
      <div className={styles.ventStrip}>
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className={styles.vent} />)}
      </div>
    </div>
  )
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000)   return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}
