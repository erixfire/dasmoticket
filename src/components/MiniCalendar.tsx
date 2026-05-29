import styles from './MiniCalendar.module.css'

interface DayCount { date: string; count: number }

interface Props {
  year: number
  month: number
  dayData: DayCount[]
  selectedDate?: string | null
  onSelectDate: (date: string) => void
  onMonthChange: (year: number, month: number) => void
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function MiniCalendar({ year, month, dayData, selectedDate, onSelectDate, onMonthChange }: Props) {
  const countMap = Object.fromEntries(dayData.map(d => [d.date, d.count]))
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().slice(0, 10)

  const prevMonth = () => month === 0 ? onMonthChange(year - 1, 11) : onMonthChange(year, month - 1)
  const nextMonth = () => month === 11 ? onMonthChange(year + 1, 0) : onMonthChange(year, month + 1)

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className={styles.calendar}>
      <div className={styles.nav}>
        <button onClick={prevMonth} className={styles.navBtn}>‹</button>
        <span className={styles.monthLabel}>{MONTH_NAMES[month]} {year}</span>
        <button onClick={nextMonth} className={styles.navBtn}>›</button>
      </div>
      <div className={styles.grid}>
        {DAY_NAMES.map(d => <div key={d} className={styles.dayName}>{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const count = countMap[dateStr] ?? 0
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate
          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={[
                styles.day,
                isToday ? styles.today : '',
                isSelected ? styles.selected : '',
                count > 0 ? styles.hasEvents : '',
              ].join(' ')}
            >
              <span>{day}</span>
              {count > 0 && <span className={styles.dot}>{count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
