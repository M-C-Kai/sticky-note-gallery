import type { RenderOffset } from '../scene/NoteNode'
import { mulberry32 } from '../util/prng'

export type DriftStrength = 'off' | 'soft' | 'normal' | 'strong'

export const DRIFT_STRENGTHS: DriftStrength[] = ['off', 'soft', 'normal', 'strong']

const STRENGTH_SCALE: Record<DriftStrength, number> = {
  off: 0,
  soft: 3,
  normal: 6,
  strong: 10,
}

export interface DriftParams {
  ampX: number
  ampY: number
  ampRot: number
  period: number
  phaseX: number
  phaseY: number
  phaseRot: number
}

export function driftParamsFromSeed(seed: number, strength: DriftStrength = 'normal'): DriftParams {
  const rand = mulberry32(seed)
  const scale = STRENGTH_SCALE[strength]
  return {
    ampX: scale * (0.5 + rand() * 0.9),
    ampY: scale * (0.5 + rand() * 0.9),
    ampRot: (scale / 10) * (0.4 + rand() * 0.8),
    period: 7 + rand() * 7,
    phaseX: rand() * Math.PI * 2,
    phaseY: rand() * Math.PI * 2,
    phaseRot: rand() * Math.PI * 2,
  }
}

export function driftOffsetAt(params: DriftParams, t: number): RenderOffset {
  const w = (2 * Math.PI) / params.period
  return {
    x: params.ampX * Math.sin(w * t + params.phaseX),
    y: params.ampY * Math.sin(w * t * 0.63 + params.phaseY),
    rotation: params.ampRot * Math.sin(w * t * 0.4 + params.phaseRot),
  }
}
