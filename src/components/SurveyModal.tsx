import { useState, FormEvent } from 'react'
import { api } from '@/lib/api'
import type { Ticket } from '@/types'
import styles from './SurveyModal.module.css'

interface Props {
  ticket: Ticket
  open: boolean
  onClose: () => void
  onSubmitted: () => void
}

const LABELS = ['', 'Very Poor', 'Poor', 'Okay', 'Good', 'Excellent']

export default function SurveyModal({ ticket, open, onClose, onSubmitted }: Props) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comments, setComments] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!rating) { setError('Please select a star rating'); return }
    setError(''); setLoading(true)
    try {
      await api.tickets.submitSurvey(ticket.id, rating, comments || undefined)
      setSubmitted(true)
      setTimeout(() => { onSubmitted(); onClose() }, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally { setLoading(false) }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {submitted ? (
          <div className={styles.success}>
            <div className={styles.successIcon}>🎉</div>
            <h2>Thank you!</h2>
            <p>Your feedback has been recorded.</p>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <h2>How was your experience?</h2>
              <button onClick={onClose} className={styles.closeBtn}>×</button>
            </div>
            <div className={styles.body}>
              <p className={styles.ticketRef}>
                Ticket <strong>{ticket.ticket_number}</strong> — {ticket.title}
              </p>
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`${styles.star} ${(hovered || rating) >= s ? styles.starFilled : ''}`}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(s)}
                    aria-label={`Rate ${s} stars`}
                  >
                    ★
                  </button>
                ))}
              </div>
              {(hovered || rating) > 0 && (
                <p className={styles.ratingLabel}>{LABELS[hovered || rating]}</p>
              )}
              <form onSubmit={handleSubmit}>
                <textarea
                  className={styles.comments}
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder="Optional: Share any additional comments about the service..."
                  rows={3}
                />
                <button type="submit" className={styles.submitBtn} disabled={loading || !rating}>
                  {loading ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
