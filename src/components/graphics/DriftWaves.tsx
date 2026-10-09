import { cn } from '../../lib/cn'

/** Stable 0–7 offset so repeated cards do not share a start frame. */
export function wavePhaseFor(seed: string | null | undefined, index = 0): number {
  const text = seed || String(index)
  let hash = index * 3
  for (let i = 0; i < text.length; i++) hash += text.charCodeAt(i)
  return hash % 8
}

/** Rotating water blobs, clipped by a relative overflow-hidden parent. */
export function DriftWaves({
  align = 'start',
  colors,
  deep = false,
  phase = 0,
}: {
  align?: 'start' | 'end'
  /** Back, middle, and front fills. Defaults to the shared aqua drift. */
  colors?: [string, string, string]
  /** Show the accent colors at full depth. */
  deep?: boolean
  /** Shifts the loop so neighboring cards do not start together. */
  phase?: number
}) {
  const [back, mid, front] = colors ?? []
  const animationDelay = phase > 0 ? `-${phase * 9}s` : undefined

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        deep && 'invite-wave-deep',
      )}
      aria-hidden
    >
      <div className={align === 'end' ? 'invite-wave-box invite-wave-box-end' : 'invite-wave-box'}>
        <div
          className="invite-wave"
          style={{ background: back, animationDelay }}
        />
        <div
          className="invite-wave invite-wave-two"
          style={{ background: mid, animationDelay }}
        />
        <div
          className="invite-wave invite-wave-three"
          style={{ background: front, animationDelay }}
        />
      </div>
    </div>
  )
}
