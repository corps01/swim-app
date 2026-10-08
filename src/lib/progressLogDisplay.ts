import type { ProgressLog } from './api/progressLogs'

export function formatProgressLogWhen(iso: string): { dateLine: string; timeLine: string } {
  const date = new Date(iso)
  const dateLine = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
  const timeLine = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return { dateLine, timeLine }
}

export function formatLatestActivitySnippet(log: ProgressLog): string {
  const when = new Date(log.createdAt)
  const relative = formatRelativeDay(when)
  const text = (log.note?.trim() || (log.photoUrl ? 'New progress photo' : 'Update')).replace(
    /\s+/g,
    ' ',
  )
  const clipped = text.length > 72 ? `${text.slice(0, 69)}…` : text
  const camera = log.photoUrl ? ' 📷' : ''
  return `${relative}: ${clipped}${camera}`
}

function formatRelativeDay(date: Date): string {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfThat = new Date(date)
  startOfThat.setHours(0, 0, 0, 0)
  const diffDays = Math.round((startOfToday.getTime() - startOfThat.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
