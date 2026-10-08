import { forwardRef, useEffect, useId, useImperativeHandle, useState, type FocusEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  CLASS_CODE_LENGTH,
  formatClassCodeBlocks,
  normalizeClassCodeInput,
} from '../../lib/classCode'
import { Field } from '../ui/Field'

export interface ClassCodeInputHandle {
  /** Normalize draft (e.g. before submit) without relying on blur. */
  flushNormalization: () => string
}

interface ClassCodeInputProps {
  /** Normalized 6-character code (parent state). */
  value: string
  onChange: (normalizedCode: string) => void
  error?: string
  disabled?: boolean
  className?: string
}

export const ClassCodeInput = forwardRef<ClassCodeInputHandle, ClassCodeInputProps>(
  function ClassCodeInput({ value, onChange, error, disabled, className }, ref) {
  const id = useId()
  const [draft, setDraft] = useState(() => formatClassCodeBlocks(value))

  useEffect(() => {
    setDraft(formatClassCodeBlocks(value))
  }, [value])

  function commitDraft(raw: string) {
    const normalized = normalizeClassCodeInput(raw)
    onChange(normalized)
    setDraft(formatClassCodeBlocks(normalized))
    return normalized
  }

  useImperativeHandle(
    ref,
    () => ({
      flushNormalization: () => commitDraft(draft),
    }),
    [draft, onChange],
  )

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    commitDraft(event.target.value)
  }

  const normalizedLength = normalizeClassCodeInput(draft).length

  return (
    <Field
      id={id}
      label="Class code"
      hint={`${normalizedLength}/${CLASS_CODE_LENGTH} characters`}
      error={error}
      className={className}
    >
      <div className="relative">
        <KeyRound
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-primary"
          aria-hidden
        />
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="one-time-code"
          spellCheck={false}
          disabled={disabled}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={handleBlur}
          placeholder="A B C 1 2 3"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'h-14 w-full rounded-2xl border bg-surface-container-lowest py-0 pl-11 pr-3 text-center font-mono text-headline-sm font-bold tracking-[0.35em] text-on-surface uppercase shadow-sm outline-none transition-all placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-outline-variant',
            error ? 'border-error focus:ring-2 focus:ring-error/30' : 'border-outline-variant/40 focus:ring-2 focus:ring-primary',
          )}
        />
      </div>
    </Field>
  )
},
)
