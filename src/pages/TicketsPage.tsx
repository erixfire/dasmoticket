import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Ticket, TicketNote } from '@/types'
import TicketFilters from '@/components/TicketFilters'
import TicketTable from '@/components/TicketTable'
import CreateTicketModal from '@/components/CreateTicketModal'
import TicketDetailPanel from '@/components/TicketDetailPanel'
import { PageHeader, EmptyState, SkeletonTable, toast } from '@/components/ui'
import styles from './TicketsPage.module.css'

interface Filters {
  status: string
  category: string
  priority: string
  search: string
}

const DEFAULT_FILTERS: Filters = { status: '', category: '', priority: '', search: '' }

export default function TicketsPage() {
  const [tickets, setTickets]       = useState<Ticket[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [filters, setFilters]       = useState<Filters>(DEFAULT_FILTERS)
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected]     = useState<{ ticket: Ticket; notes: TicketNote[] } | null>(null)

  const isFiltered = Object.values(filters).some(Boolean)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page) }
      if (filters.status)   params.status   = filters.status
      if (filters.category) params.category = filters.category
      if (filters.priority) params.priority = filters.priority
      if (filters.search)   params.search   = filters.search
      const res = await api.tickets.list(params)
      setTickets(res.data.tickets)
      setTotal(res.data.total)
    } catch {
      toast('error', 'Failed to load tickets. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => { load() }, [load])

  const handleSelect = async (ticket: Ticket) => {
    try {
      const res = await api.tickets.get(ticket.id)
      setSelected({ ticket: res.data.ticket, notes: res.data.notes })
    } catch {
      toast('error', 'Could not load ticket details.')
    }
  }

  const handleFilterChange = (f: Filters) => { setFilters(f); setPage(1) }
  const handleFilterReset  = () => { setFilters(DEFAULT_FILTERS); setPage(1) }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className={styles.page}>
      <PageHeader
        title="Tickets"
        subtitle={`${total} ticket${total !== 1 ? 's' : ''} total`}
        actions={
          <button onClick={() => setShowCreate(true)} className={styles.createBtn}>
            + New Ticket
          </button>
        }
      />

      <TicketFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
      />

      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={isFiltered ? '🔍' : '🎫'}
          title={isFiltered ? 'No matching tickets' : 'No tickets yet'}
          description={isFiltered
            ? 'Try adjusting your filters or search term.'
            : 'Create your first ticket to get started.'}
          action={isFiltered
            ? { label: 'Clear filters', onClick: handleFilterReset }
            : { label: 'Create a ticket', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <TicketTable
          tickets={tickets}
          loading={loading}
          onSelect={handleSelect}
        />
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>← Prev</button>
          <span className={styles.pageInfo}>Page {page} of {totalPages} &nbsp;&middot;&nbsp; {total} tickets</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>Next →</button>
        </div>
      )}

      {showCreate && (
        <CreateTicketModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            load()
            toast('success', 'Ticket created successfully!')
          }}
        />
      )}

      {selected && (
        <TicketDetailPanel
          ticket={selected.ticket}
          notes={selected.notes}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            load()
            toast('success', 'Ticket updated.')
          }}
        />
      )}
    </div>
  )
}
