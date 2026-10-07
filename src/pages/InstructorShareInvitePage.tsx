import { useCallback, useEffect, useState } from 'react'
import { Link2, Mail, MessageCircle, Printer, QrCode } from 'lucide-react'
import { AppLayout } from '../components/layout'
import { useAuth } from '../hooks/useAuth'
import { useInstructorRoster } from '../hooks/useInstructorRoster'
import { PLACEHOLDER_CLASS_LABEL } from '../lib/api/instructors'
import { inviteLinkFor, shortClassCodeLabel } from '../lib/instructorInvite'
import { Badge, Button, Card, MaterialIcon } from '../components/ui'
import { cn } from '../lib/cn'

const ROSTER_CAPACITY = 8

interface InstructorShareInvitePageProps {
  onBack: () => void
}

function parentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return name.slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function InstructorShareInvitePage({ onBack }: InstructorShareInvitePageProps) {
  const { user } = useAuth()
  const instructorId = user?.id
  const { roster, loading, error, refresh } = useInstructorRoster(instructorId)

  const [toast, setToast] = useState<string | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [requireApproval, setRequireApproval] = useState(true)

  const inviteLink = instructorId ? inviteLinkFor(instructorId) : ''
  const inviteCode = instructorId ?? ''
  const shortCode = instructorId ? shortClassCodeLabel(instructorId) : ''

  const showToast = useCallback((message: string) => {
    setToast(message)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function copyText(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text)
      showToast(message)
    } catch {
      showToast('Could not copy — try selecting the text manually.')
    }
  }

  function openSms() {
    const body = encodeURIComponent(`Join my swim class on SplashPass: ${inviteLink}`)
    window.location.href = `sms:?&body=${body}`
  }

  function openEmail() {
    const subject = encodeURIComponent('SplashPass class invite')
    const body = encodeURIComponent(
      `Hi!\n\nJoin our class using this link:\n${inviteLink}\n\nOr enter class code: ${inviteCode}`,
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <AppLayout
      title="Share class / invite"
      subtitle="Pool deck active session"
      onBack={onBack}
      variant="flow"
    >
      <div className="flex flex-col gap-4 pb-8">
        {/* Class context */}
        <section
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary-container to-primary p-4 text-on-primary shadow-[0_4px_20px_-2px_rgba(0,100,124,0.2)]"
        >
          <svg
            className="pointer-events-none absolute -bottom-6 -right-6 size-36 text-on-primary/10"
            viewBox="0 0 100 100"
            fill="currentColor"
            aria-hidden
          >
            <path d="M0,50 C20,30 40,70 60,50 C80,30 100,70 120,50 L120,100 L0,100 Z" />
          </svg>
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-primary-fixed/30 bg-primary-fixed/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary-fixed">
                <span>{PLACEHOLDER_CLASS_LABEL}</span>
              </div>
              <h2 className="text-headline-md font-extrabold leading-tight text-on-primary">
                {PLACEHOLDER_CLASS_LABEL}
              </h2>
              <p className="mt-0.5 text-body-sm text-on-primary/80">
                Instructor: {user?.fullName ?? 'Coach'}
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-on-primary/20 bg-on-primary/10 px-2.5 py-1.5 text-center backdrop-blur-sm">
              <span className="block text-[11px] font-semibold uppercase tracking-tighter text-primary-fixed">
                Enrolled
              </span>
              <span className="text-headline-sm font-extrabold text-on-primary">
                {loading ? '—' : roster.length} / {ROSTER_CAPACITY}
              </span>
            </div>
          </div>
        </section>

        {/* Share card */}
        <Card variant="outline" className="rounded-3xl border-outline-variant/30 shadow-[0_4px_20px_-2px_rgba(0,100,124,0.08)]">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-headline-md font-extrabold text-on-surface">Share with parents</h3>
              <p className="mt-1 text-body-sm leading-relaxed text-on-surface-variant">
                Parents join using your invite link or code to enroll swimmers on your roster.
              </p>
            </div>
            <Badge tone="primary" className="shrink-0 text-[11px] font-bold">Instant sync</Badge>
          </div>

          <div className="mb-4 space-y-2">
            <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-3.5 transition-colors">
              <p className="text-label-sm font-bold text-on-surface">Invite link</p>
              <p className="mt-1 break-all text-body-sm text-on-surface-variant">{inviteLink}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className="rounded-2xl bg-surface-container-high shadow-sm"
              onClick={() => void copyText(inviteLink, 'Invite link copied to clipboard!')}
            >
              <Link2 className="size-4" aria-hidden />
              Copy invite link
            </Button>
          </div>

          <div className="mb-5 space-y-2">
            <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-3.5">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-label-sm font-bold text-on-surface">Class code</p>
                <span className="rounded bg-primary-fixed/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-on-primary-fixed-variant">
                  Short + UUID
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-mono text-body-md font-bold text-primary">{shortCode}</p>
                <span className="text-[11px] text-on-surface-variant">full key below</span>
              </div>
              <p className="mt-1 break-all font-mono text-[11px] leading-snug text-on-surface-variant">
                {inviteCode}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className="rounded-2xl bg-surface-container-high shadow-sm"
              onClick={() => void copyText(inviteCode, `${shortCode} copied to clipboard!`)}
            >
              <MaterialIcon name="content_copy" size={16} />
              Copy class code
            </Button>
          </div>

          <div className="my-4 h-px bg-outline-variant/30" />

          <p className="mb-2.5 text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
            Quick deck sharing
          </p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <button
              type="button"
              className="flex flex-col items-center rounded-2xl border border-outline-variant/30 bg-surface-container-low p-2 transition-colors active:scale-[0.97] hover:border-primary/30 hover:bg-primary-fixed/20"
              onClick={openSms}
            >
              <div className="mb-1.5 flex size-10 items-center justify-center rounded-xl bg-secondary text-on-secondary shadow-sm">
                <MessageCircle className="size-5" aria-hidden />
              </div>
              <span className="text-[11px] font-semibold text-on-surface">Message</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center rounded-2xl border border-outline-variant/30 bg-surface-container-low p-2 transition-colors active:scale-[0.97] hover:border-primary/30 hover:bg-primary-fixed/20"
              onClick={() => setQrOpen(true)}
            >
              <div className="mb-1.5 flex size-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container shadow-sm">
                <QrCode className="size-5" aria-hidden />
              </div>
              <span className="text-[11px] font-semibold text-on-surface">QR code</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center rounded-2xl border border-outline-variant/30 bg-surface-container-low p-2 transition-colors active:scale-[0.97] hover:border-primary/30 hover:bg-primary-fixed/20"
              onClick={openEmail}
            >
              <div className="mb-1.5 flex size-10 items-center justify-center rounded-xl bg-on-surface text-surface-container-lowest shadow-sm">
                <Mail className="size-5" aria-hidden />
              </div>
              <span className="text-[11px] font-semibold text-on-surface">Email</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center rounded-2xl border border-outline-variant/30 bg-surface-container-low p-2 transition-colors active:scale-[0.97] hover:border-primary/30 hover:bg-primary-fixed/20"
              onClick={() => void copyText(inviteLink, 'Link ready — paste into your print slip')}
            >
              <div className="mb-1.5 flex size-10 items-center justify-center rounded-xl bg-tertiary text-on-tertiary shadow-sm">
                <Printer className="size-5" aria-hidden />
              </div>
              <span className="text-[11px] font-semibold text-on-surface">Print slip</span>
            </button>
          </div>
        </Card>

        {/* Settings + activity */}
        <Card variant="outline" className="rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                <MaterialIcon name="verified_user" size={16} />
              </div>
              <div>
                <p className="text-label-md font-bold text-on-surface">Require instructor approval</p>
                <p className="text-[11px] text-on-surface-variant">Screen swimmers before adding to roster</p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={requireApproval}
                onChange={(event) => setRequireApproval(event.target.checked)}
              />
              <span
                className={cn(
                  'relative h-6 w-11 rounded-full bg-surface-container-high after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-outline-variant/40 after:bg-surface-container-lowest after:transition-all after:content-[""]',
                  'peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-on-primary',
                )}
                aria-hidden
              />
            </label>
          </div>
        </Card>

        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h4 className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
              Recent roster joins
            </h4>
            <Button variant="ghost" size="sm" className="h-auto text-label-sm" onClick={() => void refresh()}>
              Refresh
            </Button>
          </div>

          {error ? (
            <p className="text-body-sm text-error">{error}</p>
          ) : loading ? (
            <p className="text-body-sm text-on-surface-variant">Loading activity…</p>
          ) : roster.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-lowest p-4 text-center text-body-sm text-on-surface-variant">
              No joins yet. Share your link to see parents here.
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/30 overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
              {roster.map((row) => (
                <li
                  key={row.childId}
                  className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-surface-container-low/80"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-container text-[11px] font-bold text-on-secondary-container"
                      aria-hidden
                    >
                      {parentInitials(row.parentName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-label-md font-bold text-on-surface">{row.parentName}</p>
                      <p className="truncate text-[11px] text-on-surface-variant">
                        {row.firstName}&apos;s parent · Joined via invite
                      </p>
                    </div>
                  </div>
                  <Badge status="completed" size="sm" className="shrink-0 gap-1 font-semibold">
                    <span className="size-1.5 rounded-full bg-secondary" aria-hidden />
                    Verified
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Copy toast */}
      {toast ? (
        <div
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-on-surface/95 px-4 py-2.5 text-label-sm font-semibold text-surface-container-lowest shadow-lg backdrop-blur"
          role="status"
        >
          <MaterialIcon name="check_circle" size={16} className="text-secondary-container" filled />
          {toast}
        </div>
      ) : null}

      {/* QR sheet */}
      {qrOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-dialog-title"
        >
          <div className="relative w-full max-w-sm rounded-t-3xl bg-surface-container-lowest p-6 text-center shadow-xl sm:rounded-3xl">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-outline-variant/50 sm:hidden" aria-hidden />
            <button
              type="button"
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant"
              aria-label="Close"
              onClick={() => setQrOpen(false)}
            >
              ×
            </button>
            <h3 id="qr-dialog-title" className="text-headline-md font-extrabold text-on-surface">
              Scan at pool deck
            </h3>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Parents can open your invite link or enter your class code in SplashPass.
            </p>
            <div className="mx-auto my-5 inline-block rounded-2xl border-2 border-dashed border-primary/30 bg-primary-fixed/30 p-4">
              <QrCode className="mx-auto size-32 text-primary" strokeWidth={1.25} aria-hidden />
              <p className="mt-2 max-w-[12rem] break-all font-mono text-[10px] text-on-surface-variant">
                {shortCode}
              </p>
            </div>
            <p className="mb-4 text-body-sm text-on-surface-variant">
              Class: <strong className="text-on-surface">{PLACEHOLDER_CLASS_LABEL}</strong>
            </p>
            <Button type="button" fullWidth onClick={() => setQrOpen(false)}>Done</Button>
          </div>
        </div>
      ) : null}
    </AppLayout>
  )
}
