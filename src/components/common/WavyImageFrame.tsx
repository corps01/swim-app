import { useEffect, useId, useRef } from 'react'
import { cn } from '../../lib/cn'

const WIDTH = 4 / 3
const HEIGHT = 1
const AMPLITUDE = 0.018
const RADIUS = 0.16
const LOBES = 32
const SAMPLES = LOBES * 24

/** Base outline samples. Phase shifts the scallops around this fixed shape. */
const OUTLINE = (() => {
  const inset = AMPLITUDE
  const w = WIDTH - inset * 2
  const h = HEIGHT - inset * 2
  const straightX = w - RADIUS * 2
  const straightY = h - RADIUS * 2
  const arc = (Math.PI * RADIUS) / 2
  const perimeter = 2 * straightX + 2 * straightY + 4 * arc

  function base(distance: number): { x: number; y: number; nx: number; ny: number } {
    let s = distance
    const left = inset
    const top = inset
    const right = inset + w
    const bottom = inset + h

    if (s < straightX) return { x: left + RADIUS + s, y: top, nx: 0, ny: -1 }
    s -= straightX
    if (s < arc) {
      const angle = -Math.PI / 2 + s / RADIUS
      return {
        x: right - RADIUS + RADIUS * Math.cos(angle),
        y: top + RADIUS + RADIUS * Math.sin(angle),
        nx: Math.cos(angle),
        ny: Math.sin(angle),
      }
    }
    s -= arc
    if (s < straightY) return { x: right, y: top + RADIUS + s, nx: 1, ny: 0 }
    s -= straightY
    if (s < arc) {
      const angle = s / RADIUS
      return {
        x: right - RADIUS + RADIUS * Math.cos(angle),
        y: bottom - RADIUS + RADIUS * Math.sin(angle),
        nx: Math.cos(angle),
        ny: Math.sin(angle),
      }
    }
    s -= arc
    if (s < straightX) return { x: right - RADIUS - s, y: bottom, nx: 0, ny: 1 }
    s -= straightX
    if (s < arc) {
      const angle = Math.PI / 2 + s / RADIUS
      return {
        x: left + RADIUS + RADIUS * Math.cos(angle),
        y: bottom - RADIUS + RADIUS * Math.sin(angle),
        nx: Math.cos(angle),
        ny: Math.sin(angle),
      }
    }
    s -= arc
    if (s < straightY) return { x: left, y: bottom - RADIUS - s, nx: -1, ny: 0 }
    s -= straightY
    const angle = Math.PI + s / RADIUS
    return {
      x: left + RADIUS + RADIUS * Math.cos(angle),
      y: top + RADIUS + RADIUS * Math.sin(angle),
      nx: Math.cos(angle),
      ny: Math.sin(angle),
    }
  }

  return Array.from({ length: SAMPLES }, (_, index) => {
    const distance = (index / SAMPLES) * perimeter
    const point = base(distance)
    return {
      x: point.x / WIDTH,
      y: point.y / HEIGHT,
      nx: point.nx / WIDTH,
      ny: point.ny / HEIGHT,
      turn: (distance / perimeter) * LOBES * Math.PI * 2,
    }
  })
})()

function scallopPath(phase: number): string {
  return `${OUTLINE.map((point, index) => {
    const swell = AMPLITUDE * Math.cos(point.turn + phase)
    const x = point.x + point.nx * swell
    const y = point.y + point.ny * swell
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(4)} ${y.toFixed(4)}`
  }).join(' ')} Z`
}

interface WavyImageFrameProps {
  src: string
  alt?: string
  className?: string
  /** Tailwind aspect class. Defaults to a 4:3 frame. */
  aspectRatio?: string
}

export function WavyImageFrame({
  src,
  alt = '',
  className,
  aspectRatio = 'aspect-[4/3]',
}: WavyImageFrameProps) {
  const clipId = `scallop-mask-${useId().replace(/:/g, '')}`
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const path = pathRef.current
    if (!path) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    path.setAttribute('d', scallopPath(0))
    if (reduce) return

    let frame = 0
    const started = performance.now()
    const tick = (now: number) => {
      const phase = ((now - started) / 90000) * Math.PI * 2 * LOBES
      path.setAttribute('d', scallopPath(phase))
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div className={cn('relative w-full', aspectRatio, className)}>
      <svg className="pointer-events-none absolute size-0" aria-hidden>
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path ref={pathRef} d={scallopPath(0)} />
          </clipPath>
        </defs>
      </svg>
      <img src={src} alt={alt} className="size-full object-cover" style={{ clipPath: `url(#${clipId})` }} />
    </div>
  )
}
