import { useMemo } from 'react'

const FALLBACK_TIME_ZONE = 'UTC'

export function getDeviceTimeZone(): string {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim()
    if (resolved) return resolved
  } catch {
    // ignore
  }
  return FALLBACK_TIME_ZONE
}

export function useDeviceTimeZone(): string {
  return useMemo(() => getDeviceTimeZone(), [])
}
