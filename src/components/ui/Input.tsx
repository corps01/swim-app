import { useId, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import { MaterialIcon } from './MaterialIcon'
import { Field } from './Field'
import { controlClass } from './styles'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  hint?: ReactNode
  error?: string
  leadingIcon?: ReactNode
  clearable?: boolean
  revealable?: boolean
}

export function Input({
  id,
  label,
  hint,
  error,
  leadingIcon,
  clearable = false,
  revealable = false,
  className,
  type = 'text',
  value,
  onChange,
  disabled,
  ...props
}: InputProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const [visible, setVisible] = useState(false)
  const inputType = revealable ? (visible ? 'text' : 'password') : type
  const showClear = clearable && String(value ?? '').length > 0 && !disabled

  function clearValue() {
    onChange?.({
      target: { value: '' },
      currentTarget: { value: '' },
    } as ChangeEvent<HTMLInputElement>)
  }

  return (
    <Field id={fieldId} label={label} hint={hint} error={error} className={className}>
      <div className="relative flex items-center">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-3.5 text-primary [&_svg]:size-5">
            {leadingIcon}
          </span>
        ) : null}
        <input
          {...props}
          id={fieldId}
          type={inputType}
          value={value}
          disabled={disabled}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={cn(
            controlClass,
            leadingIcon && 'pl-11',
            (showClear || revealable) && 'pr-11',
            showClear && revealable && 'pr-20',
            inputType === 'password' && 'tracking-widest placeholder:tracking-normal',
          )}
        />
        {showClear ? (
          <Button
            variant="icon"
            className={cn(
              'absolute top-1/2 -translate-y-1/2',
              revealable ? 'right-12' : 'right-3',
            )}
            aria-label={label ? `Clear ${label}` : 'Clear'}
            onClick={clearValue}
          >
            <MaterialIcon name="cancel" size={18} />
          </Button>
        ) : null}
        {revealable ? (
          <Button
            variant="icon"
            className="absolute top-1/2 right-3 -translate-y-1/2"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            <MaterialIcon name={visible ? 'visibility_off' : 'visibility'} size={20} />
          </Button>
        ) : null}
      </div>
    </Field>
  )
}
