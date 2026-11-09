import type { Vector2 } from '../scene/NoteNode'

export interface ReflowAnimation {
  from: Vector2
  to: Vector2
  start: number
  duration: number
}

export const DEFAULT_REFLOW_DURATION = 520

export function easeOutCubic(t: number): number {
  const u = 1 - t
  return 1 - u * u * u
}

export function reflowPositionAt(anim: ReflowAnimation, now: number): Vector2 | null {
  const elapsed = now - anim.start
  if (elapsed >= anim.duration) return { ...anim.to }
  const t = easeOutCubic(elapsed / anim.duration)
  return {
    x: anim.from.x + (anim.to.x - anim.from.x) * t,
    y: anim.from.y + (anim.to.y - anim.from.y) * t,
  }
}
