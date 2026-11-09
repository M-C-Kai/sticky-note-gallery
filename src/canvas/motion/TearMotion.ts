export const TEAR_COMMIT_THRESHOLD = 0.6
export const TEAR_ANIMATION_SPEED = 2.2

/**
 * Advances a node's tear progress toward its target (0 = cancel, 1 = commit).
 * Returns the new progress value.
 */
export function updateTearProgress(current: number, target: 0 | 1, dt: number, speed = TEAR_ANIMATION_SPEED): number {
  if (current >= target) return target
  return Math.min(current + speed * dt, target)
}

export function tearPeelRotation(progress: number): number {
  return progress * progress * -0.5
}

export function tearDropOffset(progress: number): number {
  const eased = progress * progress
  return eased * 60
}
