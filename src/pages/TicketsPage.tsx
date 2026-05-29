import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Ticket, TicketNote } from '@/types'
import TicketFilters from '@/components/TicketFilters'
import TicketTable from '@/components/TicketTable'
import CreateTicketModal from '@/components/CreateTicketModal'
import TicketDetailPanel from '@/components/TicketDetailPanel'
import styles from './TicketsPage.module.css'

export default function TicketsPage() {
  const [tickets, setTickets]       = useState<Ticket[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [filters, setFilters]       = useState<Record<string,string>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected]     = useState<{ ticket: Ticket; notes: TicketNote[] } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.tickets.list({ ...filters, page: String(page) })
      setTickets(res.data.tickets)
      setTotal(res.data.total)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filters, page])

  useEffect(() => { load() }, [load])

  const handleRowClick = async (ticket: Ticket) => {
    const res = await api.tickets.get(ticket.id)
    setSelected({ ticket: res.data.ticket, notes: res.data.notes })
  }

  const handleFilterChange = (f: Record<string, string>) => {
    setFilters(f)
    setPage(1)
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Tickets</h1>
        <button onClick={() => setShowCreate(true)} className={styles.createBtn}>+ New Ticket</button>
      </div>

      <TicketFilters onChange={handleFilterChange} />

      <TicketTable
        tickets={tickets}
        loading={loading}
        onRowClick={handleRowClick}
      />

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>&larr; Prev</button>
          <span className={styles.pageInfo}>Page {page} of {totalPages} &nbsp;&middot;&nbsp; {total} tickets</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>Next &rarr;</button>
        </div>
      )}

      {showCreate && (
        <CreateTicketModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}

      {selected && (
        <TicketDetailPanel
          ticket={selected.ticket}
          notes={selected.notes}
          onClose={() => setSelected(null)}
          onUpdated={load}
        />
      )}
    </div>
  )
}
