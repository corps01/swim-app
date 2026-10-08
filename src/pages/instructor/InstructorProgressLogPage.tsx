import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppPath } from '../../hooks/useAppPath'
import { createProgressLog } from '../../lib/api/progressLogs'
import {
  fetchSessionDeckClass,
  fetchSessionDeckSwimmers,
  type SessionDeckSwimmer,
} from '../../lib/api/sessionDeck'
import { fetchInstructorSwimmers } from '../../lib/api/instructorSwimmers'
import {
  instructorProgressLogPath,
  instructorProgressLogReturnPath,
  parseInstructorProgressLogSearch,
} from '../../lib/appNavigation'
import { formatAppError, throwIfSupabaseError } from '../../lib/errors'
import { ageFromDateOfBirth } from '../../lib/swimmers'
import { PROGRESS_ALL_QUICK_TAGS, appendQuickTagToNote } from '../../lib/progressLogTags'
import { getSupabaseClient } from '../../lib/supabase'
import { Button, MaterialIcon } from '../../components/ui'
import { cn } from '../../lib/cn'

function swimmerInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function shortName(first: string, last: string) {
  return `${first} ${last.charAt(0)}.`
}

export function InstructorProgressLogPage() {
  const { search, replace, goBack } = useAppPath()
  const { childId, classId, date, from } = parseInstructorProgressLogSearch(search)
  const returnPath = instructorProgressLogReturnPath(search)

  const [deckSwimmers, setDeckSwimmers] = useState<SessionDeckSwimmer[]>([])
  const [classMeta, setClassMeta] = useState<Awaited<ReturnType<typeof fetchSessionDeckClass>> | null>(
    null,
  )
  const [fallbackLabel, setFallbackLabel] = useState<string | null>(null)
  const [fallbackParent, setFallbackParent] = useState<string | null>(null)
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const activeSwimmer = useMemo(() => {
    if (!childId) return null
    const fromDeck = deckSwimmers.find((row) => row.childId === childId)
    if (fromDeck) return fromDeck
    return null
  }, [childId, deckSwimmers])

  const displayName = activeSwimmer
    ? `${activeSwimmer.firstName} ${activeSwimmer.lastName}`
    : fallbackLabel ?? 'Swimmer'

  const parentLine = activeSwimmer?.parentName ?? fallbackParent ?? 'Parent'

  const age = dateOfBirth ? ageFromDateOfBirth(dateOfBirth) : null

  const loadMeta = useCallback(async () => {
    if (!childId) return
    setLoadingMeta(true)
    try {
      if (classId) {
        const [meta, swimmers] = await Promise.all([
          fetchSessionDeckClass(classId),
          fetchSessionDeckSwimmers(classId),
        ])
        setClassMeta(meta)
        setDeckSwimmers(swimmers)
      } else {
        const rows = await fetchInstructorSwimmers()
        const entry = rows.find((row) => row.childId === childId)
        if (entry) {
          setFallbackLabel(`${entry.firstName} ${entry.lastName}`)
          setFallbackParent(entry.parentName)
        }
      }

      const supabase = getSupabaseClient()
      const { data, error: childError } = await supabase
        .from('children')
        .select('date_of_birth')
        .eq('id', childId)
        .maybeSingle()
      throwIfSupabaseError(childError)
      setDateOfBirth(data?.date_of_birth ?? null)
    } catch (err) {
      setError(formatAppError(err))
    } finally {
      setLoadingMeta(false)
    }
  }, [childId, classId])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  useEffect(() => {
    setNote('')
    setPhotoFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setError(null)
  }, [childId])

  function leaveLog() {
    goBack(returnPath)
  }

  function selectSwimmer(nextChildId: string) {
    replace(
      instructorProgressLogPath({
        childId: nextChildId,
        classId,
        date,
        from: from === 'swimmers' ? 'swimmers' : undefined,
      }),
    )
  }

  function clearPhoto() {
    setPhotoFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFileChange(file: File | undefined) {
    clearPhoto()
    if (!file) return
    setPhotoFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!childId) return
    setSubmitting(true)
    setError(null)
    try {
      await createProgressLog({
        childId,
        classId,
        note,
        photoFile,
      })
      setToast('Update posted for parents.')
      window.setTimeout(() => {
        setToast(null)
        leaveLog()
      }, 1200)
    } catch (err) {
      setError(formatAppError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const classSubtitle = classMeta?.name ?? (classId ? 'Class session' : '')
  const scheduleLine = classMeta?.scheduleDetails?.trim() || classMeta?.location?.trim() || ''

  const canSubmit = Boolean(note.trim() || photoFile) && !submitting

  if (!childId) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-surface px-margin-screen">
        <p className="text-body-md text-on-surface-variant">Choose a swimmer to log progress.</p>
        <Button type="button" variant="secondary" className="rounded-full" onClick={leaveLog}>
          Go to swimmers
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-surface text-on-surface">
      <header className="fixed inset-x-0 top-0 z-50 bg-surface/85 pt-safe shadow-[0_4px_16px_-2px_rgba(8,145,178,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between gap-3 px-margin-screen">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Go back"
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-on-surface transition-all hover:bg-surface-container active:scale-95"
              onClick={leaveLog}
            >
              <MaterialIcon name="arrow_back" size={24} />
            </button>
            <h1 className="truncate text-headline-sm text-on-surface">Log swimmer progress</h1>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-on-primary">
            <MaterialIcon name="person" size={18} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-margin-screen pb-36 pt-[calc(4rem+env(safe-area-inset-top))]">
        <section className="pb-2 pt-3">
          <div className="flex flex-col gap-3 rounded-2xl bg-surface-container-low p-card-padding shadow-[0_4px_16px_-2px_rgba(8,145,178,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-primary-fixed shadow-sm">
                  <div className="flex size-full items-center justify-center text-label-lg font-bold text-on-primary-fixed-variant">
                    {swimmerInitials(
                      activeSwimmer?.firstName ?? displayName.split(' ')[0] ?? 'S',
                      activeSwimmer?.lastName ?? displayName.split(' ')[1] ?? 'W',
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-surface-container-low bg-secondary" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-headline-md text-on-surface">{displayName}</h2>
                    {age != null ? (
                      <span className="rounded-full bg-secondary-container px-2 py-0.5 text-label-sm font-semibold text-on-secondary-container">
                        Age {age}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-body-sm text-on-surface-variant">
                    {classSubtitle}
                    {scheduleLine ? ` • ${scheduleLine}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
                <MaterialIcon name="pool" size={24} />
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-surface-container px-3 py-2 text-on-surface">
              <MaterialIcon name="water_drop" size={20} className="shrink-0 text-primary" />
              <p className="flex-1 text-body-sm">Capture today&apos;s milestone &amp; photo on the pool deck</p>
            </div>
          </div>
        </section>

        {classId && deckSwimmers.length > 1 ? (
          <section className="mt-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MaterialIcon name="group" size={18} className="text-primary" />
                <span className="text-label-lg font-bold uppercase tracking-wider text-on-surface">
                  Session swimmers
                </span>
              </div>
              <span className="text-label-sm text-on-surface-variant">{deckSwimmers.length} on deck</span>
            </div>
            <div className="flex gap-3 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {deckSwimmers.map((swimmer) => {
                const selected = swimmer.childId === childId
                return (
                  <button
                    key={swimmer.childId}
                    type="button"
                    onClick={() => selectSwimmer(swimmer.childId)}
                    className={cn(
                      'flex shrink-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3.5 transition-all active:scale-95',
                      selected
                        ? 'bg-primary text-on-primary shadow-[0_4px_16px_-2px_rgba(8,145,178,0.25)]'
                        : 'bg-surface-container-lowest text-on-surface shadow-sm',
                    )}
                  >
                    <div
                      className={cn(
                        'relative flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary-fixed-dim text-label-sm font-bold',
                        selected && 'ring-2 ring-on-primary/30',
                      )}
                    >
                      {swimmerInitials(swimmer.firstName, swimmer.lastName)}
                      {selected ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-primary/25">
                          <MaterialIcon name="check" size={16} className="text-on-primary" />
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-label-md font-bold leading-none">
                        {shortName(swimmer.firstName, swimmer.lastName)}
                      </span>
                      <span
                        className={cn(
                          'text-label-sm leading-tight',
                          selected ? 'text-primary-fixed opacity-90' : 'text-on-surface-variant',
                        )}
                      >
                        {classSubtitle}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-4">
          <div className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(8,145,178,0.08)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MaterialIcon name="photo_camera" size={20} className="text-primary" />
                <h3 className="text-headline-sm text-on-surface">Poolside snapshot</h3>
              </div>
              {photoFile ? (
                <span className="flex items-center gap-1 rounded-full bg-secondary-container px-2.5 py-1 text-label-sm font-semibold text-on-secondary-container">
                  <MaterialIcon name="check_circle" size={14} />
                  Photo attached
                </span>
              ) : null}
            </div>

            {previewUrl ? (
              <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-surface-container shadow-sm">
                <img src={previewUrl} alt="Preview" className="size-full object-cover" />
                <div className="absolute inset-x-0 top-2.5 flex items-center justify-between px-2.5">
                  <div className="rounded-full bg-inverse-surface/80 px-2.5 py-1 text-label-sm text-inverse-on-surface backdrop-blur-md">
                    {photoFile?.name ?? 'photo.jpg'}
                  </div>
                  <button
                    type="button"
                    aria-label="Remove photo"
                    className="flex size-8 items-center justify-center rounded-full bg-error text-on-error shadow-md active:scale-90"
                    onClick={clearPhoto}
                  >
                    <MaterialIcon name="delete" size={18} />
                  </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-inverse-surface/80 to-transparent p-2.5">
                  <label
                    className="cursor-pointer rounded-full bg-surface-container-lowest/90 px-3 py-1.5 text-label-md font-bold text-primary shadow-sm backdrop-blur-sm"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => handleFileChange(e.target.files?.[0])}
                    />
                    Retake / change
                  </label>
                </div>
              </div>
            ) : (
              <label
                className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant/50 bg-surface-container text-on-surface-variant"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <MaterialIcon name="add_a_photo" size={32} className="text-primary" />
                <span className="text-label-md font-semibold text-on-surface">Tap to add a photo</span>
              </label>
            )}

            <div className="flex items-center gap-1.5">
              <MaterialIcon name="lock" size={16} className="text-outline" />
              <p className="text-body-sm text-on-surface-variant">
                Only visible to {parentLine}&apos;s linked guardians
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4">
          <div className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(8,145,178,0.08)]">
            <div className="flex items-center gap-2">
              <MaterialIcon name="edit_note" size={20} className="text-primary" />
              <h3 className="text-headline-sm text-on-surface">Instructor milestone note</h3>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                maxLength={500}
                placeholder="E.g., Put her head underwater today! Fantastic rotary breathing on back stroke drills."
                className="w-full resize-none bg-transparent text-body-md text-on-surface outline-none placeholder:text-outline"
              />
              <div className="flex justify-end pt-2">
                <span className="text-label-sm text-on-surface-variant">{note.length}/500</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                Tap to add quick skills
              </span>
              <div className="flex flex-wrap gap-2">
                {PROGRESS_ALL_QUICK_TAGS.map((tag) => {
                  const active = note.toLowerCase().includes(tag.toLowerCase())
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md transition-all active:scale-95',
                        active
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high',
                      )}
                      onClick={() => setNote((prev) => appendQuickTagToNote(prev, tag))}
                    >
                      <MaterialIcon name={active ? 'check' : 'add'} size={16} />
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {error ? <p className="mt-3 text-body-sm text-error">{error}</p> : null}
        {loadingMeta ? (
          <p className="mt-3 text-body-sm text-on-surface-variant">Loading swimmer…</p>
        ) : null}
      </main>

      <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/20 bg-surface/95 px-margin-screen pb-safe pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <Button
            type="button"
            className="min-h-[52px] w-full rounded-full text-label-lg font-bold shadow-[0_8px_20px_-4px_rgba(8,145,178,0.35)]"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            <MaterialIcon name="send" size={22} />
            {submitting ? 'Posting…' : 'Post update to parent stream'}
          </Button>
        </div>
      </aside>

      {toast ? (
        <div
          className="fixed inset-x-4 top-24 z-50 mx-auto max-w-md rounded-2xl bg-surface-container-lowest p-card-padding shadow-lg"
          role="status"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
              <MaterialIcon name="task_alt" size={22} />
            </div>
            <div>
              <h4 className="text-headline-sm text-on-surface">Milestone published!</h4>
              <p className="text-body-sm text-on-surface-variant">{toast}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
