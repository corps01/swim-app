import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { cn } from '../lib/cn'
import type { UserRole } from '../types/database'
import { BrandMark } from './layout'
import { Badge, Button, Card, Input, MaterialIcon } from './ui'

type AuthMode = 'sign-in' | 'sign-up'

function roleTabClass(selected: boolean, tone: 'parent' | 'instructor') {
  return cn(
    'flex flex-1 items-center justify-center gap-2 rounded px-3 py-3 text-label-lg transition-all',
    selected && tone === 'parent' && 'bg-surface-container-lowest text-primary shadow-sm',
    selected && tone === 'instructor' && 'bg-secondary-container text-on-secondary-container shadow-sm',
    !selected && 'text-on-surface-variant hover:text-on-surface',
  )
}

export function AuthForm() {
  const { signIn, signUp, bypassAuth } = useAuth()
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('parent')
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const isParent = role === 'parent'
  const signingUp = mode === 'sign-up'

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setConfirmationSent(false)
    setLoading(true)

    const emailClean = email.replace(/\s/g, '').trim()
    const passwordClean = password.trim()
    const nameClean = fullName.trim().replace(/\s+/g, ' ')

    setEmail(emailClean)
    setPassword(passwordClean)
    if (signingUp) setFullName(nameClean)

    try {
      if (signingUp) {
        const result = await signUp(nameClean, emailClean, passwordClean, role)
        if (result.needsEmailConfirmation) {
          setConfirmationSent(true)
          setMode('sign-in')
        }
      } else {
        await signIn(emailClean, passwordClean)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const blobs = isParent
    ? [
        'bg-primary-fixed/45',
        'bg-primary-container/30',
        'bg-primary-fixed/35',
        'bg-primary/15',
        'bg-primary-fixed-dim/40',
      ]
    : [
        'bg-secondary-container/80',
        'bg-secondary-fixed/55',
        'bg-secondary-container/50',
        'bg-secondary-fixed-dim/45',
        'bg-secondary-container/40',
      ]

  return (
    <>
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className={cn('-left-16 -top-24 h-64 w-64 rounded-full blur-3xl transition-colors', blobs[0], 'absolute')} />
      <div className={cn('-right-10 top-16 h-52 w-52 rounded-full blur-3xl transition-colors', blobs[1], 'absolute')} />
      <div className={cn('left-1/3 top-1/2 h-40 w-40 rounded-full blur-2xl transition-colors', blobs[2], 'absolute')} />
      <div className={cn('-bottom-16 left-8 h-56 w-56 rounded-full blur-3xl transition-colors', blobs[3], 'absolute')} />
      <div className={cn('-right-8 bottom-24 h-48 w-48 rounded-full blur-3xl transition-colors', blobs[4], 'absolute')} />
    </div>
    <div className="relative z-10 flex flex-col pb-8">
      <div className="mt-2 mb-6 flex flex-col items-center text-center">
        <BrandMark className="mb-3.5" />
        <Badge tone="primary" size="md" pulse className="mb-2 uppercase">
          SplashPass
        </Badge>
        <h1 className="text-headline-lg-mobile tracking-tight text-on-surface">Dive into SplashPass</h1>
        <p className="mt-1 max-w-xs text-body-md text-on-surface-variant">
          {signingUp
            ? isParent
              ? 'Create your account, then add a swimmer and instructor invite.'
              : 'Create your instructor account, then add a class and share its code with parents.'
            : isParent
              ? 'Sign in to manage swimmers and pre-session forms.'
              : 'Sign in to see the families linked to your classes.'}
        </p>
      </div>

      <div className="mb-5 flex items-center rounded-lg bg-surface-container-low p-1.5 shadow-sm" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={isParent}
          className={roleTabClass(isParent, 'parent')}
          onClick={() => setRole('parent')}
        >
          <MaterialIcon name="diversity_1" filled size={19} />
          Parent
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isParent}
          className={roleTabClass(!isParent, 'instructor')}
          onClick={() => setRole('instructor')}
        >
          <MaterialIcon name="sports" size={19} />
          Instructor
        </button>
      </div>

      <Card
        className={cn(
          'transition-colors',
          !isParent && 'bg-secondary-container',
        )}
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span
                className={cn('size-2.5 rounded-full', isParent ? 'bg-primary' : 'bg-secondary')}
                aria-hidden
              />
              <span className="text-label-md text-on-surface-variant">
                {isParent ? 'Family access' : 'Instructor access'}
              </span>
            </div>
            <Badge tone="neutral">
              {signingUp ? 'New account' : 'Sign in'}
            </Badge>
          </div>

          {signingUp ? (
            <Input
              label="Your name"
              hint="Required"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              leadingIcon={<MaterialIcon name="person" size={20} />}
              required
            />
          ) : null}

          <Input
            label="Email"
            hint="Required"
            type="email"
            inputMode="email"
            autoComplete="email"
            clearable
            value={email}
            onChange={(event) => setEmail(event.target.value.replace(/\s/g, ''))}
            leadingIcon={<MaterialIcon name="alternate_email" size={20} />}
            required
          />

          <Input
            label="Password"
            type="password"
            revealable
            minLength={8}
            autoComplete={signingUp ? 'new-password' : 'current-password'}
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            leadingIcon={<MaterialIcon name="lock" size={20} />}
            required
          />

          {confirmationSent ? (
            <p
              role="status"
              className="rounded bg-primary-container px-3 py-2 text-body-sm text-on-primary-container"
            >
              Check your email to confirm your account, then sign in as{' '}
              {isParent ? 'a parent' : 'an instructor'}.
            </p>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded bg-error-container px-3 py-2 text-body-sm text-on-error-container"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            fullWidth
            className={cn('mt-2', !isParent && '!from-secondary !to-on-secondary-fixed-variant')}
            disabled={loading}
            trailingIcon={<MaterialIcon name="arrow_forward" size={18} />}
          >
            {loading ? 'Please wait…' : signingUp ? 'Create account' : 'Sign in to SplashPass'}
          </Button>
        </form>
      </Card>

      {signingUp ? null : (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex w-full items-center gap-3 px-4">
            <div className="h-px flex-1 bg-outline-variant/40" />
            <span className="text-label-sm uppercase tracking-wider text-outline">
              Fast poolside login
            </span>
            <div className="h-px flex-1 bg-outline-variant/40" />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            leadingIcon={
              <MaterialIcon
                name="fingerprint"
                filled
                size={22}
                className="text-primary"
              />
            }
          >
            Or tap Face ID / Touch ID
          </Button>
        </div>
      )}

      <Card variant="muted" className="mt-5 flex-row items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
          <MaterialIcon name="pool" size={18} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-label-md text-on-surface">
            {signingUp ? 'Already have an account?' : 'New here?'}
          </span>
          <p className="text-body-sm text-on-surface-variant">
            {signingUp
              ? 'Sign in with the email you already confirmed.'
              : isParent
                ? 'Create a parent account to enroll a swimmer.'
                : 'Create an instructor account, add a class, and share your class code with parents.'}{' '}
            <button
              type="button"
              className="text-label-sm text-primary underline"
              onClick={() => {
                setError(null)
                setMode(signingUp ? 'sign-in' : 'sign-up')
              }}
            >
              {signingUp ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </div>
      </Card>

      {import.meta.env.DEV ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-center text-body-sm text-on-surface-variant">
            Dev only. Skips Supabase. Screens load, but saved data will not.
          </p>
          <Button type="button" variant="secondary" fullWidth onClick={() => bypassAuth('parent')}>
            Skip auth as parent
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => bypassAuth('instructor')}
          >
            Skip auth as instructor
          </Button>
        </div>
      ) : null}
    </div>
    </>
  )
}
