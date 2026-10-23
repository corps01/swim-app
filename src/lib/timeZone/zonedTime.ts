/**
 * Pool-local wall clock → UTC instant.
 * Two passes cover a DST gap. Never uses the device timezone.
 */

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

/** `time` is `HH:mm` or `HH:mm:ss` on `dateKey` in `timeZone`. */
export function zonedWallTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  const [hour, minute, second] = time.split(':').map(Number)
  const guess = Date.UTC(year, month - 1, day, hour, minute, second || 0)
  let utc = guess - timezoneOffsetMs(new Date(guess), timeZone)
  utc = guess - timezoneOffsetMs(new Date(utc), timeZone)
  return new Date(utc)
}

/** Clock label such as "4:00 PM" in `timeZone`. */
export function formatZonedTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}
