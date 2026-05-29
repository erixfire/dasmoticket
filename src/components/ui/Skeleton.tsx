import styles from './Skeleton.module.css'

interface SkeletonProps {
  width?: string
  height?: string
  borderRadius?: string
  className?: string
}

export function Skeleton({ width = '100%', height = '1rem', borderRadius = '6px', className = '' }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  )
}

// Preset skeletons for common patterns
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className={styles.textGroup}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height="0.875rem" />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <Skeleton width="2.5rem" height="2.5rem" borderRadius="50%" />
        <div className={styles.cardHeaderText}>
          <Skeleton width="40%" height="1rem" />
          <Skeleton width="60%" height="0.75rem" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className={styles.table}>
      <div className={styles.tableHeader}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width={i === 0 ? '30%' : '15%'} height="0.75rem" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={styles.tableRow}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={c === 0 ? '40%' : '20%'} height="0.875rem" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div className={styles.statCard}>
      <Skeleton width="2rem" height="2rem" borderRadius="8px" />
      <Skeleton width="3rem" height="2rem" />
      <Skeleton width="60%" height="0.75rem" />
    </div>
  )
}
