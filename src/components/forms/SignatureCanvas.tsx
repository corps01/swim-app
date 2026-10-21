import { useEffect, useRef, type PointerEvent } from 'react'
import { Button } from '../ui'

interface SignatureCanvasProps {
  onChange: (dataUrl: string | null) => void
  error?: string
}

const INK = '#04596e'

export function SignatureCanvas({ onChange, error }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const inkRef = useRef(false)
  const lastRef = useRef<{ x: number; y: number } | null>(null)

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
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, rect.width, rect.height)
      ctx.lineWidth = 2.4
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
    inkRef.current = true
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
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    ctx.strokeStyle = INK
    inkRef.current = false
    onChange(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label-md text-on-surface">I agree &amp; sign</p>
        <Button type="button" variant="secondary" size="sm" className="h-11 rounded-full px-4" onClick={clear}>
          Clear
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        aria-label="Signature"
        className="h-44 w-full touch-none rounded-2xl border border-outline-variant/50 bg-white"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      <p className="text-body-sm text-on-surface-variant">Sign with your finger or mouse.</p>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
