import type { NoteNode, Rect, RenderOffset } from '../scene/NoteNode'
import type { NoteColor } from '@/domain/note'
import { NOTE_COLOR_STYLES } from './noteColors'

export interface NoteStyle {
  bg: string
  text: string
  border: string
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.arcTo(x + w, y, x + w, y + radius, radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius)
  ctx.lineTo(x + radius, y + h)
  ctx.arcTo(x, y + h, x, y + h - radius, radius)
  ctx.lineTo(x, y + radius)
  ctx.arcTo(x, y, x + radius, y, radius)
  ctx.closePath()
}

function tornBottomPath(ctx: CanvasRenderingContext2D, left: number, right: number, y: number, amplitude: number, seed: number): void {
  const segments = 6
  const step = (right - left) / segments
  let phase = seed % 100
  ctx.beginPath()
  ctx.moveTo(left, y)
  for (let i = 0; i < segments; i++) {
    const x1 = left + step * i
    const jag = Math.sin(phase + i * 1.7) * amplitude
    ctx.lineTo(x1 + step / 2, y + jag)
    ctx.lineTo(x1 + step, y)
    phase += 1.3
  }
  ctx.closePath()
}

export interface DrawNoteOptions {
  style: NoteStyle
  rotation: number
  tearProgress: number
  interacting: boolean
  tearHandleHeight: number
  showTearHandle: boolean
  seed: number
}

export function drawNote(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  text: string,
  opts: DrawNoteOptions,
): void {
  const { width, height } = rect
  const cx = rect.x + width / 2
  const cy = rect.y + height / 2

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(opts.rotation)

  const halfW = width / 2
  const halfH = height / 2

  // soft shadow
  ctx.save()
  ctx.shadowColor = 'rgba(60, 50, 30, 0.18)'
  ctx.shadowBlur = 14
  ctx.shadowOffsetY = 6
  ctx.fillStyle = opts.style.bg
  roundedRectPath(ctx, -halfW, -halfH, width, height, 6)
  ctx.fill()
  ctx.restore()

  // body
  ctx.fillStyle = opts.style.bg
  roundedRectPath(ctx, -halfW, -halfH, width, height, 6)
  ctx.fill()

  // border
  ctx.strokeStyle = opts.style.border
  ctx.lineWidth = 1
  roundedRectPath(ctx, -halfW, -halfH, width, height, 6)
  ctx.stroke()

  // torn bottom edge when tearing
  if (opts.tearProgress > 0) {
    const amplitude = opts.tearProgress * 16
    ctx.fillStyle = opts.style.bg
    tornBottomPath(ctx, -halfW + 2, halfW - 2, halfH - 2, amplitude, opts.seed)
    ctx.fill()
    ctx.strokeStyle = opts.style.border
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // top tape strip
  ctx.save()
  ctx.translate(0, -halfH + 10)
  ctx.rotate(-0.06)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillRect(-halfW * 0.55, -7, width * 0.55, 14)
  ctx.restore()

  // tear handle tab (bottom center)
  if (opts.showTearHandle || opts.tearProgress > 0) {
    const tabHalf = width * 0.22
    const tabTop = halfH - opts.tearHandleHeight
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-tabHalf, tabTop)
    ctx.lineTo(tabHalf, tabTop)
    ctx.lineTo(tabHalf, halfH)
    const teeth = 4
    const step = (tabHalf * 2) / teeth
    for (let i = teeth - 1; i >= 0; i--) {
      const x = -tabHalf + step * (i + 0.5)
      ctx.lineTo(x, halfH + (i % 2 === 0 ? -3 : -7))
      ctx.lineTo(-tabHalf + step * i, halfH)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(0,0,0,0.06)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
  }

  // text
  ctx.fillStyle = opts.style.text
  ctx.font = '15px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
  ctx.textBaseline = 'top'
  const marginX = 14
  const textTop = -halfH + 30
  const maxWidth = width - marginX * 2
  const maxLines = 3
  drawWrappedText(ctx, text, -halfW + marginX, textTop, maxWidth, 20, maxLines)

  ctx.restore()
}

export function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): void {
  const words = text.split(/(\s+)/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? current + word : word
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current.trim())
      current = word.trim()
    } else {
      current = candidate
    }
    if (lines.length >= maxLines) break
  }
  if (current && lines.length < maxLines) {
    lines.push(current.trim())
  }

  const shown = lines.slice(0, maxLines)
  for (let i = 0; i < shown.length; i++) {
    ctx.fillText(shown[i]!, x, y + i * lineHeight)
  }
  if (lines.length > maxLines || (text.length > 0 && shown[shown.length - 1] !== text && lines.length >= maxLines)) {
    const last = shown[shown.length - 1]
    if (last) {
      const ellipsis = last.slice(0, Math.max(1, last.length - 1)) + '…'
      ctx.fillText(ellipsis, x, y + (maxLines - 1) * lineHeight)
    }
  }
}

export interface DrawBackgroundOptions {
  width: number
  height: number
}

export function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.75)
  gradient.addColorStop(0, '#fbf7ec')
  gradient.addColorStop(1, '#f3ead6')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

export function noteStyleFor(color: NoteColor): NoteStyle {
  return NOTE_COLOR_STYLES[color]
}

export function renderNote(ctx: CanvasRenderingContext2D, note: NoteNode, rect: Rect, offset: RenderOffset, options: Omit<DrawNoteOptions, 'style'>): void {
  const renderRect: Rect = {
    x: rect.x + offset.x,
    y: rect.y + offset.y,
    width: rect.width,
    height: rect.height,
  }
  drawNote(ctx, renderRect, note.model.text, { ...options, style: noteStyleFor(note.color) })
}
