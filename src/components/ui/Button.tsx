import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-md hover:shadow-lg',
  secondary: 'bg-surface-container-low text-on-surface hover:bg-surface-container',
  ghost: 'h-auto rounded-none bg-transparent px-0 text-label-md text-primary shadow-none hover:text-primary-container hover:underline',
  icon: 'size-8 rounded-full bg-transparent p-0 text-outline shadow-none hover:text-on-surface',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-label-md',
  md: 'h-12 px-4 text-label-md',
  lg: 'h-[52px] px-4 text-label-lg',
}

export function Button({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  className,
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const bare = variant === 'ghost' || variant === 'icon'

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
        bare ? 'active:scale-100' : 'active:scale-[0.98] disabled:active:scale-100',
        bare ? null : sizes[size],
        variants[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  )
}
