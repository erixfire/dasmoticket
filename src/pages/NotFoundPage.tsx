export default function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 700, color: '#e2e8f0' }}>404</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: '1rem' }}>Page not found.</p>
      <a href="/dashboard" style={{ color: 'var(--color-primary)', marginTop: '1rem', display: 'inline-block' }}>← Back to Dashboard</a>
    </div>
  )
}
