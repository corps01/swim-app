import { useState } from 'react'
import { MaterialIcon } from '../ui'
import { cn } from '../../lib/cn'

const DISMISS_KEY_PREFIX = 'splashpass:dailyPromptDismissed:'

interface InstructorDailyPromptBannerProps {
  dateKey: string
  className?: string
  onLogProgress?: () => void
}

export function InstructorDailyPromptBanner({
  dateKey,
  className,
  onLogProgress,
}: InstructorDailyPromptBannerProps) {
  const storageKey = `${DISMISS_KEY_PREFIX}${dateKey}`
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(storageKey) === '1')

  if (dismissed) return null

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-secondary/30 bg-secondary-container/40 p-4',
        className,
      )}
      role="status"
    >
      <MaterialIcon name="photo_camera" size={22} className="mt-0.5 shrink-0 text-secondary" />
      <div className="min-w-0 flex-1">
        <p className="text-label-md font-bold text-on-secondary-container">
          After your last class today
        </p>
        <p className="mt-0.5 text-body-sm text-on-secondary-container/90">
          Capture a quick photo or note from the deck so parents see it on their activity feed.
        </p>
        {onLogProgress ? (
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-label-md font-bold text-on-secondary active:scale-95"
            onClick={onLogProgress}
          >
            <MaterialIcon name="open_in_new" size={16} />
            Open today&apos;s session
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="shrink-0 rounded-full p-1 text-on-secondary-container/80 hover:bg-on-secondary-container/10"
        aria-label="Dismiss reminder"
        onClick={() => {
          sessionStorage.setItem(storageKey, '1')
          setDismissed(true)
        }}
      >
        <MaterialIcon name="close" size={18} />
      </button>
    </div>
  )
}
