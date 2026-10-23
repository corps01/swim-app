import { useEffect, useState, type FormEvent } from 'react'
import { InstructorShell } from '../../components/navigation/InstructorShell'
import { useAuth } from '../../hooks/useAuth'
import { useAppPath } from '../../hooks/useAppPath'
import { fetchProfile, updateOwnPhone } from '../../lib/api/profile'
import { INSTRUCTOR_FORMS_PATH, SETTINGS_PATH } from '../../lib/appNavigation'
import { formatAppError } from '../../lib/errors'
import { Button, Card, MaterialIcon, ProfileAvatar } from '../../components/ui'

interface InstructorAccountPageProps {
  onNavigate: (path: string) => void
  onSignOut: () => void
}

export function InstructorAccountPage({ onNavigate, onSignOut }: InstructorAccountPageProps) {
  const { user } = useAuth()
  const { search } = useAppPath()
  const name = user?.fullName ?? 'Coach'
  const editingPhone = new URLSearchParams(search).get('edit') === 'phone'
  const [phone, setPhone] = useState('')
  const [phoneEditor, setPhoneEditor] = useState(editingPhone)
  const [savingPhone, setSavingPhone] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    void fetchProfile(user.id).then((profile) => {
      setPhone(profile?.phone ?? '')
      if (!profile?.phone) setPhoneEditor(true)
    })
  }, [user?.id])

  async function savePhone(event: FormEvent) {
    event.preventDefault()
    if (!user?.id) return
    setSavingPhone(true)
    setPhoneError(null)
    try {
      await updateOwnPhone(user.id, phone)
      setPhoneEditor(false)
    } catch (err) {
      setPhoneError(formatAppError(err))
    } finally {
      setSavingPhone(false)
    }
  }

  return (
    <InstructorShell
      activeTab="account"
      onNavigate={onNavigate}
      instructorName={name}
    >
      <div className="flex flex-col gap-4 px-margin-screen pb-8 pt-2">
        <Card className="flex-row items-center gap-4 rounded-3xl p-5">
          <ProfileAvatar name={name} size="lg" />
          <div className="min-w-0">
            <h2 className="text-headline-md text-on-surface">{name}</h2>
            <p className="mt-1 text-label-sm text-secondary">Instructor account</p>
          </div>
        </Card>

        <Card variant="outline" className="gap-3 rounded-md p-4">
          <h2 className="text-headline-sm text-on-surface">Contact</h2>
          {phoneEditor ? (
            <form className="flex flex-col gap-2" onSubmit={(event) => void savePhone(event)}>
              <label className="flex items-center gap-2 rounded-md bg-surface-container px-3">
                <MaterialIcon name="call" size={18} className="text-primary" />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  inputMode="tel"
                  placeholder="Phone number"
                  className="h-11 min-w-0 flex-1 bg-transparent text-body-md text-on-surface outline-none"
                />
              </label>
              {phoneError ? <p className="text-body-sm text-error">{phoneError}</p> : null}
              <Button type="submit" disabled={savingPhone}>
                {savingPhone ? 'Saving…' : 'Save phone'}
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-body-md text-on-surface">
                <MaterialIcon name="call" size={18} className="text-primary" />
                <MaterialIcon name="chat" size={18} className="text-primary" />
                {phone || 'No phone yet'}
              </p>
              <button type="button" className="text-label-md font-bold text-primary" onClick={() => setPhoneEditor(true)}>
                Edit
              </button>
            </div>
          )}
        </Card>

        <Card variant="outline" className="gap-3 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <MaterialIcon name="class" size={20} className="mt-0.5 text-primary" />
            <p className="text-body-sm text-on-surface-variant">
              Today is the deck. Classes holds schedules and invite codes. Swimmers holds waivers and
              BUDS history. Form templates live here.
            </p>
          </div>
        </Card>

        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="rounded-2xl"
          onClick={() => onNavigate(INSTRUCTOR_FORMS_PATH)}
        >
          <MaterialIcon name="assignment" size={18} />
          Questionnaires
        </Button>

        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="rounded-2xl"
          onClick={() => onNavigate(SETTINGS_PATH)}
        >
          <MaterialIcon name="settings" size={18} />
          Settings
        </Button>

        <Button type="button" variant="secondary" fullWidth className="rounded-2xl" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </InstructorShell>
  )
}
