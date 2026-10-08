import { cn } from '../../lib/cn'
import type { ClassAccentKey } from '../../lib/classAccent'
import { CLASS_ACCENT_STYLES } from '../../lib/classAccent'

export interface ClassCardWavesProps {
  accent?: ClassAccentKey
  /** Override the three wave fills (back, middle, front). */
  layers?: [string, string, string]
  className?: string
}

/**
 * Three overlapping wave layers (landscape), scaled to the card width.
 * Inspired by the reference pool-wave artwork; colors follow class accent tokens.
 */
export function ClassCardWaves({ accent = 'primary', layers, className }: ClassCardWavesProps) {
  const [back, mid, front] = layers ?? CLASS_ACCENT_STYLES[accent].waveLayers

  return (
    <svg
      className={cn(
        'pointer-events-none absolute bottom-0 right-0 h-[88%] w-1/2 opacity-[0.42]',
        '[mask-image:linear-gradient(to_left,rgba(0,0,0,0.9)_35%,transparent_100%)]',
        '[-webkit-mask-image:linear-gradient(to_left,rgba(0,0,0,0.9)_35%,transparent_100%)]',
        className,
      )}
      viewBox="0 0 1000 220"
      preserveAspectRatio="none"
      aria-hidden
      role="presentation"
    >
      {/* Back layer — tallest peak left-of-center */}
      <path
        fill={back}
        d="M0,95 C120,35 220,25 340,70 C460,115 520,40 640,55 C760,70 860,30 1000,65 L1000,220 L0,220 Z"
      />
      {/* Middle layer */}
      <path
        fill={mid}
        d="M0,125 C180,85 320,145 480,100 C620,65 740,120 880,95 C940,85 980,100 1000,108 L1000,220 L0,220 Z"
      />
      {/* Front layer — gentle foreground swell */}
      <path
        fill={front}
        d="M0,155 C200,120 380,175 520,140 C660,108 800,165 1000,138 L1000,220 L0,220 Z"
      />
    </svg>
  )
}
