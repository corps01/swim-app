import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

/** A single upcoming session, with the start clock in the pool's IANA timezone. */
export interface UpcomingClassAlarm {
  classId: string
  childId: string
  childName: string
  /** YYYY-MM-DD in `timeZone`, not the device timezone. */
  sessionDate: string
  /** Pool-local start, `HH:MM` or `HH:MM:SS`. */
  startTime: string
  /** IANA zone from `classes.timezone`. */
  timeZone: string
}

const CLASS_ALARM_KIND = 'class-reminder'
const CLASS_ALARM_CHANNEL = 'class-reminders'
/** Reserved int range so we only cancel alarms this app scheduled. */
const ID_BASE = 1_100_000_000
const ID_SPAN = 900_000_000
/** iOS keeps at most 64 pending local notifications. */
const MAX_PENDING = 60

export interface ForegroundReminder {
  title: string
  body: string
}

type ForegroundHandler = (reminder: ForegroundReminder) => void

let foregroundListening = false
let channelReady = false

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

function isClassAlarmId(id: number): boolean {
  return id >= ID_BASE && id < ID_BASE + ID_SPAN
}

function alarmId(session: UpcomingClassAlarm): number {
  const input = `${session.classId}:${session.childId}:${session.sessionDate}`
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (Math.imul(hash, 31) + input.charCodeAt(index)) >>> 0
  }
  return ID_BASE + (hash % ID_SPAN)
}

function timezoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  const wallAsUtc = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'), read('second'))
  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** Pool-local wall clock → UTC instant. Two passes cover a DST gap. */
export function zonedWallTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  const [hour, minute, second] = time.split(':').map(Number)
  const guess = Date.UTC(year, month - 1, day, hour, minute, second || 0)
  let utc = guess - timezoneOffsetMs(new Date(guess), timeZone)
  utc = guess - timezoneOffsetMs(new Date(utc), timeZone)
  return new Date(utc)
}

async function ensureAndroidChannel(): Promise<void> {
  if (channelReady || Capacitor.getPlatform() !== 'android') return
  await LocalNotifications.createChannel({
    id: CLASS_ALARM_CHANNEL,
    name: 'Class reminders',
    description: 'Reminders before swim class',
    importance: 4,
    visibility: 1,
    vibration: true,
  })
  channelReady = true
}

/** Ask for notification permission. No-op in a browser. */
export async function requestLocalNotificationPermissions(): Promise<boolean> {
  if (!isNative()) return false
  await ensureAndroidChannel()
  const current = await LocalNotifications.checkPermissions()
  const status = current.display === 'granted' ? current : await LocalNotifications.requestPermissions()
  return status.display === 'granted'
}

/**
 * Show an in-app banner when a class alarm arrives while the app is open.
 * Native only. Safe to call more than once.
 */
export function listenForForegroundReminders(onReminder: ForegroundHandler): void {
  if (!isNative() || foregroundListening) return
  foregroundListening = true
  void LocalNotifications.addListener('localNotificationReceived', (notification) => {
    onReminder({
      title: notification.title ?? 'Swim class',
      body: notification.body ?? '',
    })
  })
}

/**
 * Drop previously scheduled class alarms, then schedule `class start − notifyBeforeHours`
 * for each upcoming session. Cancelled or dropped sessions disappear because every
 * class alarm is cleared before the new set is written.
 */
export async function syncClassReminders(
  upcomingClasses: UpcomingClassAlarm[],
  notifyBeforeHours: number,
): Promise<void> {
  if (!isNative()) return
  const allowed = await requestLocalNotificationPermissions()
  if (!allowed) return

  const pending = await LocalNotifications.getPending()
  const stale = pending.notifications.filter((notification) => {
    if (isClassAlarmId(notification.id)) return true
    const extra = notification.extra
    return Boolean(
      extra && typeof extra === 'object' && (extra as { kind?: string }).kind === CLASS_ALARM_KIND,
    )
  })
  if (stale.length > 0) {
    await LocalNotifications.cancel({ notifications: stale.map((notification) => ({ id: notification.id })) })
  }

  const now = Date.now()
  const byId = new Map<number, { at: Date; title: string; body: string; extra: Record<string, string> }>()

  for (const session of upcomingClasses) {
    if (!session.timeZone || !session.sessionDate || !session.startTime) continue
    let startsAt: Date
    try {
      startsAt = zonedWallTimeToUtc(session.sessionDate, session.startTime, session.timeZone)
    } catch {
      continue
    }
    if (Number.isNaN(startsAt.getTime())) continue
    const triggerAt = new Date(startsAt.getTime() - notifyBeforeHours * 3_600_000)
    if (triggerAt.getTime() <= now + 5_000) continue

    const timeLabel = new Intl.DateTimeFormat(undefined, {
      timeZone: session.timeZone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(startsAt)
    const childName = session.childName.trim() || 'your swimmer'
    const id = alarmId(session)
    const existing = byId.get(id)
    if (existing && existing.at.getTime() <= triggerAt.getTime()) continue

    byId.set(id, {
      at: triggerAt,
      title: `Swim Class Today — ${childName}`,
      body: `Class starts at ${timeLabel}. Please complete today's BUDS health check!`,
      extra: {
        kind: CLASS_ALARM_KIND,
        classId: session.classId,
        childId: session.childId,
        sessionDate: session.sessionDate,
      },
    })
  }

  const next = [...byId.entries()]
    .sort((left, right) => left[1].at.getTime() - right[1].at.getTime())
    .slice(0, MAX_PENDING)

  if (next.length === 0) return

  await LocalNotifications.schedule({
    notifications: next.map(([id, alarm]) => ({
      id,
      title: alarm.title,
      body: alarm.body,
      schedule: { at: alarm.at, allowWhileIdle: true },
      channelId: CLASS_ALARM_CHANNEL,
      extra: alarm.extra,
    })),
  })
}
