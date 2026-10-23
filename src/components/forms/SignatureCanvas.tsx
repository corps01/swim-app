import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { MaterialIcon } from '../ui'

interface SignatureCanvasProps {
  onChange: (dataUrl: string | null) => void
  error?: string
  label?: string
  hint?: string
  signerName?: string | null
}

const INK = '#00647c'

function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor" aria-hidden>
      <path d="M17.65 6.35A7.96 7.96 0 0 0 12 4V1L7 6l5 5V7c2.76 0 5 2.24 5 5a5 5 0 0 1-8.9 3.1l-1.47 1.46A7 7 0 1 0 17.65 6.35z" />
    </svg>
  )
}

function VerifiedBadge() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor" aria-hidden>
      <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.2 14.5-3.3-3.3 1.4-1.4 1.9 1.9 4.3-4.3 1.4 1.4-5.7 5.7z" />
    </svg>
  )
}

function recordedLabel(date: Date): string {
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
  return `Today • ${time}`
}

export function SignatureCanvas({
  onChange,
  error,
  label = 'Parent / Guardian Signature',
  hint = 'Sign here with your finger',
  signerName,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const inkRef = useRef(false)
  const lastRef = useRef<{ x: number; y: number } | null>(null)
  const [hasInk, setHasInk] = useState(false)
  const [recordedAt, setRecordedAt] = useState(() => new Date())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function prepare() {
      const node = canvasRef.current
      if (!node || inkRef.current) return
      const rect = node.getBoundingClientRect()
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      node.width = Math.max(1, Math.floor(rect.width * ratio))
      node.height = Math.max(1, Math.floor(rect.height * ratio))
      const ctx = node.getContext('2d')
      if (!ctx) return
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = INK
    }

    prepare()
    const observer = new ResizeObserver(() => prepare())
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  function context() {
    const canvas = canvasRef.current
    return canvas?.getContext('2d') ?? null
  }

  function pointFrom(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function publish() {
    const canvas = canvasRef.current
    if (!canvas || !inkRef.current) {
      onChange(null)
      return
    }
    onChange(canvas.toDataURL('image/png'))
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.preventDefault()
    const ctx = context()
    if (!ctx) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    lastRef.current = pointFrom(event)
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    event.preventDefault()
    const ctx = context()
    const last = lastRef.current
    if (!ctx || !last) return
    const next = pointFrom(event)
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(next.x, next.y)
    ctx.stroke()
    lastRef.current = next
    if (!inkRef.current) {
      inkRef.current = true
      setHasInk(true)
      setRecordedAt(new Date())
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    publish()
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = context()
    if (!canvas || !ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    ctx.strokeStyle = INK
    inkRef.current = false
    setHasInk(false)
    setRecordedAt(new Date())
    onChange(null)
  }

  const signer = signerName?.trim()

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface-container-lowest p-card-padding shadow-[0_4px_16px_-2px_rgba(0,100,124,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <MaterialIcon name="draw" size={20} className="shrink-0 text-primary" />
          <span className="text-label-lg text-on-surface">{label}</span>
        </div>
        <button
          type="button"
          onClick={clear}
          className="inline-flex shrink-0 items-center gap-1 text-label-sm font-semibold text-primary hover:text-primary-container"
        >
          <ClearIcon />
          Clear
        </button>
      </div>

      <div className="relative h-36 cursor-crosshair overflow-hidden rounded-lg bg-surface-container-low/70">
        {hasInk ? null : (
          <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center gap-1 text-outline">
            <MaterialIcon name="fingerprint" size={28} />
            <span className="text-body-sm">{hint}</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          aria-label="Signature"
          className="absolute inset-0 z-[1] h-full w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-9 left-4 right-4 z-[2] h-0.5"
          style={{
            backgroundImage: 'repeating-linear-gradient(to right, #9aa6ac 0 4px, transparent 4px 8px)',
          }}
        />
      </div>

      <div className="flex items-start justify-between gap-3 pt-0.5">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-bold leading-4 tracking-wide text-secondary">
          <VerifiedBadge />
          <span>{signer ? `Verified Signer: ${signer}` : 'Verified Signer'}</span>
        </span>
        <span className="shrink-0 text-right text-[11px] font-bold leading-4 tracking-wide text-outline">
          Recorded: {recordedLabel(recordedAt)}
        </span>
      </div>

      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
