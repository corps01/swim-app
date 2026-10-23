import type { ReactNode } from 'react'
import { CLASS_ACCENT_STYLES, type ClassAccentKey } from '../../lib/classAccent'
import { DriftWaves } from '../graphics/DriftWaves'
import { Badge, MaterialIcon, ProfileAvatar } from '../ui'

export interface ClassOverviewSwimmer {
  id: string
  name: string
  age: number | null
  onOpen?: () => void
}

interface ClassOverviewCardProps {
  accent: ClassAccentKey
  title: string
  status?: 'active' | 'pending'
  instructor: string
  schedule: string
  location: string
  season: string | null
  wavePhase?: number
  swimmers?: ClassOverviewSwimmer[]
  swimmerCount?: number
  onOpen: () => void
  openLabel?: string
  footer?: ReactNode
}

export function ClassOverviewCard({
  accent,
  title,
  status = 'active',
  instructor,
  schedule,
  location,
  season,
  wavePhase = 0,
  swimmers = [],
  swimmerCount,
  onOpen,
  openLabel = 'Open',
  footer,
}: ClassOverviewCardProps) {
  const style = CLASS_ACCENT_STYLES[accent]
  const seasonText = season?.replace(/^Season:\s*/, '') || 'Season dates not set'

  return (
    <article className="overflow-hidden rounded-2xl border border-outline-variant/25 bg-surface-container-lowest shadow-[0_8px_24px_-8px_rgba(8,145,178,0.16)]">
      <button type="button" className="block w-full text-left" onClick={onOpen}>
        <div className="relative overflow-hidden px-3.5 py-3 text-white" style={{ background: style.gradient }}>
          <DriftWaves align="end" colors={style.waveLayers} deep phase={wavePhase} />
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <MaterialIcon name="pool" size={18} filled />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Class</p>
                <h3 className="truncate text-label-lg font-extrabold uppercase tracking-wide">{title}</h3>
              </div>
            </div>
            <Badge tone={status === 'pending' ? 'warning' : 'success'}>
              {status === 'pending' ? 'Pending' : 'Active'}
            </Badge>
          </div>
        </div>
      </button>

      <div className="flex flex-col gap-2.5 bg-surface-container-lowest px-3.5 py-3">
        <Meta icon="person" tint="bg-cyan-50 text-cyan-800" label="Lead instructor" value={instructor} />
        <Meta icon="schedule" tint="bg-blue-50 text-blue-700" label="Class schedule" value={schedule} />
        <Meta icon="location_on" tint="bg-emerald-50 text-emerald-700" label="Pool" value={location} />
        <Meta icon="date_range" tint="bg-purple-50 text-purple-700" label="Season" value={seasonText} />
      </div>

      <div className="border-t border-outline-variant/20 bg-surface-container-low/70 px-3.5 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant">
            Enrolled swimmers <span className="text-primary">• {swimmerCount ?? swimmers.length}</span>
          </p>
          <button type="button" className="text-[11px] font-semibold text-primary" onClick={onOpen}>
            {openLabel}
          </button>
        </div>
        {swimmers.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {swimmers.map((swimmer) => {
              const row = (
                <>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ProfileAvatar name={swimmer.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-label-md text-on-surface">{swimmer.name}</span>
                      {swimmer.age != null ? (
                        <span className="block text-[11px] text-on-surface-variant">Age {swimmer.age}</span>
                      ) : null}
                    </span>
                  </div>
                  {swimmer.onOpen ? <MaterialIcon name="chevron_right" size={18} className="text-outline" /> : null}
                </>
              )
              return (
                <li key={swimmer.id}>
                  {swimmer.onOpen ? (
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-2.5 py-2 text-left"
                      onClick={swimmer.onOpen}
                    >
                      {row}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-2.5 py-2">
                      {row}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : swimmerCount == null ? (
          <p className="text-body-sm text-on-surface-variant">No swimmers enrolled yet.</p>
        ) : null}
        {footer}
      </div>
    </article>
  )
}

function Meta({ icon, tint, label, value }: { icon: string; tint: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        <MaterialIcon name={icon} size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</p>
        <p className="truncate text-label-md text-on-surface">{value}</p>
      </div>
    </div>
  )
}
