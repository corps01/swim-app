import { cn } from '../../lib/cn'

/** SplashPass swimmer avatar colorways. `to-tr` runs bottom-left to upper-right. */
const PROFILE_COLORS = [
  'bg-gradient-to-tr from-cyan-600 to-teal-400',
  'bg-gradient-to-tr from-sky-600 to-blue-400',
  'bg-gradient-to-tr from-emerald-600 to-teal-300',
  'bg-gradient-to-tr from-amber-500 to-yellow-300',
  'bg-gradient-to-tr from-rose-500 to-pink-400',
  'bg-gradient-to-tr from-indigo-600 to-purple-400',
  'bg-gradient-to-tr from-purple-600 to-fuchsia-400',
  'bg-gradient-to-tr from-slate-700 to-slate-500',
] as const

const sizes = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-[11px]',
  md: 'size-12 text-label-lg',
  lg: 'size-14 text-headline-sm',
  xl: 'size-16 text-headline-sm',
  '2xl': 'size-24 text-headline-md',
} as const

export type ProfileAvatarSize = keyof typeof sizes

interface ProfileAvatarProps {
  name?: string
  firstName?: string
  lastName?: string
  size?: ProfileAvatarSize
  className?: string
}

export function profileInitials(name?: string, firstName?: string, lastName?: string): string {
  const first = firstName?.trim()
  const last = lastName?.trim()
  if (first || last) {
    return `${first?.charAt(0) ?? ''}${last?.charAt(0) ?? ''}`.toUpperCase() || '?'
  }
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase())
  return letters.join('') || '?'
}

function colorForProfile(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % PROFILE_COLORS.length
  return PROFILE_COLORS[hash] ?? PROFILE_COLORS[0]
}

export function ProfileAvatar({ name, firstName, lastName, size = 'md', className }: ProfileAvatarProps) {
  const seed = `${firstName ?? ''} ${lastName ?? ''} ${name ?? ''}`.trim() || 'swimmer'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-tight text-white shadow-sm',
        colorForProfile(seed),
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {profileInitials(name, firstName, lastName)}
    </span>
  )
}
