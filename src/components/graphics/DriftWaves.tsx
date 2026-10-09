/** Rotating water blobs, clipped by a relative overflow-hidden parent. */
export function DriftWaves({ align = 'start' }: { align?: 'start' | 'end' }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className={align === 'end' ? 'invite-wave-box invite-wave-box-end' : 'invite-wave-box'}>
        <div className="invite-wave" />
        <div className="invite-wave invite-wave-two" />
        <div className="invite-wave invite-wave-three" />
      </div>
    </div>
  )
}
