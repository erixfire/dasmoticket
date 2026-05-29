import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import type { Ticket, TicketNote } from '@/types'
import TicketTable from '@/components/TicketTable'
import TicketFilters from '@/components/TicketFilters'
import CreateTicketModal from '@/components/CreateTicketModal'
import TicketDetailPanel from '@/components/TicketDetailPanel'
import styles from './TicketsPage.module.css'

const DEFAULT_FILTERS = { status: '', category: '', priority: '', search: '' }

export default function TicketsPage() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<{ ticket: Ticket; notes: TicketNote[] } | null>(null)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page) }
      if (filters.status) params.status = filters.status
      if (filters.category) params.category = filters.category
      if (filters.priority) params.priority = filters.priority
      if (filters.search) params.search = filters.search
      const res = await api.tickets.list(params)
      setTickets(res.data.tickets)
      setTotal(res.data.total)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [page, filters])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const handleSelect = async (ticket: Ticket) => {
    try {
      const res = await api.tickets.get(ticket.id)
      setSelected({ ticket: res.data.ticket, notes: res.data.notes })
    } catch (e) { console.error(e) }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Tickets</h1>
          <p className={styles.subtitle}>{total} ticket{total !== 1 ? 's' : ''} found</p>
        </div>
        <button onClick={() => setShowCreate(true)} className={styles.newBtn}>+ New Ticket</button>
      </div>

      <TicketFilters
        filters={filters}
        onChange={f => { setFilters(f); setPage(1) }}
        onReset={() => { setFilters(DEFAULT_FILTERS); setPage(1) }}
      />

      <div className={styles.tableWrap}>
        <TicketTable tickets={tickets} onSelect={handleSelect} loading={loading} />
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={styles.pageBtn}>← Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={styles.pageBtn}>Next →</button>
        </div>
      )}

      <CreateTicketModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchTickets}
      />

      {selected && (
        <TicketDetailPanel
          ticket={selected.ticket}
          notes={selected.notes}
          onClose={() => setSelected(null)}
          onUpdated={fetchTickets}
        />
      )}
    </div>
  )
}
