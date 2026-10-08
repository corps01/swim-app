const PROGRESS_QUICK_TAGS = ['Head Underwater', 'Flutter Kicks', 'Floating'] as const

const PROGRESS_EXTRA_QUICK_TAGS = [
  'Back Float',
  'Deep End Jump',
  'Bubble Blowing',
  'Streamline Push',
] as const

export const PROGRESS_ALL_QUICK_TAGS = [...PROGRESS_QUICK_TAGS, ...PROGRESS_EXTRA_QUICK_TAGS]

export function appendQuickTagToNote(note: string, tag: string): string {
  const trimmed = note.trim()
  const fragment = tag.trim()
  if (!fragment) return trimmed
  if (trimmed.toLowerCase().includes(fragment.toLowerCase())) return trimmed
  if (!trimmed) return `${fragment}.`
  const needsSpace = !/[.!?]$/.test(trimmed)
  return `${trimmed}${needsSpace ? ' ' : ' '}${fragment}.`
}
