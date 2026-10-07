import { cn } from '../../lib/cn'

export function MaterialIcon({
  name,
  filled = false,
  size = 20,
  className,
}: {
  name: string
  filled?: boolean
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn('material-symbols-outlined inline-block leading-none', className)}
      style={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 500, 'opsz' 24`,
        fontSize: size,
      }}
      aria-hidden
    >
      {name}
    </span>
  )
}
