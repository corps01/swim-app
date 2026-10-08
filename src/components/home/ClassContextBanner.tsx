import type { ReactNode } from 'react'
import {
  CLASS_ACCENT_STYLES,
  type ClassAccentKey,
} from '../../lib/classAccent'
import { formatSeasonRangeLabel } from '../../lib/classSchedule'
import { ClassCardWaves } from '../graphics/ClassCardWaves'
import { MaterialIcon } from '../ui'

interface ClassContextBannerProps {
  accent: ClassAccentKey
  title: string
  /** Small uppercase pill (e.g. class code or “Class”) */
  pill?: string
  subtitle?: string
  /** Right-side slot (e.g. stat chip) */
  aside?: ReactNode
  children?: ReactNode
  className?: string
}

export function ClassContextBanner({
  accent,
  title,
  pill,
  subtitle,
  aside,
  children,
  className,
}: ClassContextBannerProps) {
  const style = CLASS_ACCENT_STYLES[accent]

  return (
    <div
      className={`overflow-hidden rounded-2xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.12)] ${className ?? ''}`}
    >
      <div className="relative overflow-hidden p-4 text-white" style={{ background: style.gradient }}>
        <ClassCardWaves accent={accent} />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {pill ? (
              <div
                className="mb-1.5 inline-flex items-center rounded-full border border-white/25 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
                style={{ backgroundColor: style.pillBg, color: style.pillText }}
              >
                {pill}
              </div>
            ) : null}
            <h3 className="text-headline-md font-extrabold leading-tight">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-body-sm text-white/85">{subtitle}</p> : null}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
      </div>
      {children ? (
        <div className="border-t border-outline-variant/15 bg-surface-container-lowest p-3">
          {children}
        </div>
      ) : null}
    </div>
  )
}

interface ClassDetailRowsProps {
  accent: ClassAccentKey
  schedule: string
  location: string
  instructor: string
  seasonStart?: string | null
  seasonEnd?: string | null
}

export function ClassDetailRows({
  accent,
  schedule,
  location,
  instructor,
  seasonStart,
  seasonEnd,
}: ClassDetailRowsProps) {
  const iconClass = CLASS_ACCENT_STYLES[accent].detailIconClass
  const seasonLabel = formatSeasonRangeLabel(seasonStart, seasonEnd)

  return (
    <ul className="flex flex-col gap-2">
      <li className="flex items-start gap-2 text-body-sm text-on-surface-variant">
        <MaterialIcon name="schedule" size={18} className={`mt-0.5 shrink-0 ${iconClass}`} />
        <span>{schedule}</span>
      </li>
      <li className="flex items-start gap-2 text-body-sm text-on-surface-variant">
        <MaterialIcon name="location_on" size={18} className={`mt-0.5 shrink-0 ${iconClass}`} />
        <span>{location}</span>
      </li>
      {seasonLabel ? (
        <li className="flex items-start gap-2 text-body-sm text-on-surface-variant">
          <MaterialIcon name="date_range" size={18} className={`mt-0.5 shrink-0 ${iconClass}`} />
          <span>{seasonLabel}</span>
        </li>
      ) : null}
      <li className="flex items-start gap-2 text-body-sm text-on-surface-variant">
        <MaterialIcon name="sports" size={18} className={`mt-0.5 shrink-0 ${iconClass}`} />
        <span>{instructor}</span>
      </li>
    </ul>
  )
}
