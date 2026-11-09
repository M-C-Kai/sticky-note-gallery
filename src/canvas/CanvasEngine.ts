import type { Note } from '@/domain/note'
import { NoteNode, type Rect, type Vector2 } from './scene/NoteNode'
import {
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  NOTE_WIDTH,
  NOTE_HEIGHT,
  NOTE_GAP,
  NOTE_PADDING,
  TEAR_HANDLE_HEIGHT,
} from './constants'
import {
  computeReflowTargets,
  findFreeAnchor,
  type LayoutOptions,
} from './layout/AnchorLayout'
import {
  driftOffsetAt,
  driftParamsFromSeed,
  type DriftParams,
  type DriftStrength,
} from './motion/DriftMotion'
import {
  tearDropOffset,
  tearPeelRotation,
  updateTearProgress,
} from './motion/TearMotion'
import {
  DEFAULT_REFLOW_DURATION,
  reflowPositionAt,
} from './motion/ReflowMotion'
import {
  NoteGestureController,
  type GestureCallbacks,
  type PointerPoint,
  type SceneView,
} from './gesture/NoteGestureController'
import {
  drawBackground,
  drawNote,
  noteStyleFor,
} from './renderer/CanvasRenderer'

export interface EngineCallbacks {
  onEditRequest(note: NoteNode): void
  onCompleted(note: NoteNode): void
  onAnchorChanged(note: NoteNode, anchor: Vector2): void
  onInteractionChange?(interacting: boolean): void
  onTearStart?(note: NoteNode): void
  onTearCommitted?(note: NoteNode): void
}

export interface CanvasEngineOptions {
  canvas: HTMLCanvasElement
  driftStrength?: DriftStrength
  callbacks?: EngineCallbacks
}

export class CanvasEngine implements SceneView {
  readonly noteWidth = NOTE_WIDTH
  readonly noteHeight = NOTE_HEIGHT
  readonly tearHandleHeight = TEAR_HANDLE_HEIGHT
  readonly logicalWidth = LOGICAL_WIDTH
  readonly logicalHeight = LOGICAL_HEIGHT

  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly callbacks?: EngineCallbacks
  private readonly nodes = new Map<string, NoteNode>()
  private readonly driftParams = new Map<string, DriftParams>()

  private controller: NoteGestureController
  private driftStrength: DriftStrength

  private dpr = 1
  private viewportWidth = 0
  private viewportHeight = 0
  private scale = 1
  private offsetX = 0
  private offsetY = 0

  private rafId: number | null = null
  private nowMs = 0
  private lastMs = 0
  private resizeObserver: ResizeObserver | null = null
  private destroyed = false

  constructor(options: CanvasEngineOptions) {
    this.canvas = options.canvas
    this.driftStrength = options.driftStrength ?? 'normal'
    this.callbacks = options.callbacks

    const ctx = this.canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas 2D context is not available')
    }
    this.ctx = ctx

    const gestureCallbacks: GestureCallbacks = {
      onTap: (note) => this.callbacks?.onEditRequest(note),
      onTearProgress: (note) => this.callbacks?.onTearStart?.(note),
      onMoveStarted: () => undefined,
      onMoveEnded: (note, anchor) => this.callbacks?.onAnchorChanged(note, anchor),
      onTearCommitted: (note) => this.callbacks?.onTearCommitted?.(note),
      onTearCancelled: () => undefined,
    }
    this.controller = new NoteGestureController(this, gestureCallbacks)
  }

  // ---------------------------------------------------------------- lifecycle

  start(): void {
    if (this.destroyed) return
    this.updateTransform()
    this.bindEvents()
    this.lastMs = performance.now()
    this.rafId = requestAnimationFrame(this.frame)
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.unbindEvents()
    this.destroyed = true
  }

  // ---------------------------------------------------------------- data sync

  syncFromNotes(notes: Note[]): void {
    const activeIds = new Set(notes.map((n) => n.id))
    let removed = false

    for (const id of [...this.nodes.keys()]) {
      if (!activeIds.has(id)) {
        this.nodes.delete(id)
        this.driftParams.delete(id)
        removed = true
      }
    }

    for (const note of notes) {
      const node = this.nodes.get(note.id)
      if (node) {
        node.model = note
        node.anchor = { x: note.anchorX, y: note.anchorY }
      } else {
        const newNode = new NoteNode(note)
        if (newNode.anchor.x === 0 && newNode.anchor.y === 0) {
          newNode.anchor = findFreeAnchor([...this.nodes.values()].map((n) => n.anchor), this.layoutOptions())
        }
        this.nodes.set(newNode.id, newNode)
      }
    }

    if (removed) {
      this.triggerReflow()
    }
  }

  getNextAnchor(): Vector2 {
    return findFreeAnchor([...this.nodes.values()].map((n) => n.anchor), this.layoutOptions())
  }

  setDriftStrength(strength: DriftStrength): void {
    this.driftStrength = strength
    this.driftParams.clear()
  }

  // ---------------------------------------------------------------- SceneView (gesture)

  hitTest(x: number, y: number): NoteNode | null {
    const ordered = this.nodesInZOrder()
    for (let i = ordered.length - 1; i >= 0; i--) {
      const node = ordered[i]!
      const r = this.renderRect(node)
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
        return node
      }
    }
    return null
  }

  isTearHandle(x: number, y: number, note: NoteNode): boolean {
    const r = this.renderRect(note)
    const cx = r.x + r.width / 2
    const tabHalf = r.width * 0.28
    const tabTop = r.y + r.height - this.tearHandleHeight
    return x >= cx - tabHalf && x <= cx + tabHalf && y >= tabTop && y <= r.y + r.height
  }

  setNoteAnchor(note: NoteNode, anchor: Vector2): void {
    note.anchor = { ...anchor }
  }

  // ---------------------------------------------------------------- animation loop

  private frame = (now: number): void => {
    if (this.destroyed) return
    this.rafId = requestAnimationFrame(this.frame)
    const dt = Math.min((now - this.lastMs) / 1000, 0.1)
    this.lastMs = now
    this.nowMs = now
    this.update(dt)
    this.render()
  }

  private update(dt: number): void {
    const t = this.nowMs / 1000
    const completed: NoteNode[] = []

    for (const node of this.nodes.values()) {
      if (node.interactionState === 'idle' && node.tearTarget === null) {
        node.renderOffset = driftOffsetAt(this.driftParamsFor(node), t)
      }

      if (node.tearTarget !== null) {
        const next = updateTearProgress(node.tearProgress, node.tearTarget, dt)
        node.tearProgress = next
        if (node.tearTarget === 1 && next >= 1) {
          node.tearTarget = null
          completed.push(node)
        } else if (node.tearTarget === 0 && next <= 0) {
          node.tearTarget = null
          node.tearProgress = 0
        }
      }

      if (node.reflowFrom && node.reflowTo) {
        const pos = reflowPositionAt(
          {
            from: node.reflowFrom,
            to: node.reflowTo,
            start: node.reflowStart,
            duration: node.reflowDuration,
          },
          this.nowMs,
        )
        if (pos) {
          node.anchor = pos
          if (pos.x === node.reflowTo.x && pos.y === node.reflowTo.y) {
            node.reflowFrom = null
            node.reflowTo = null
            this.callbacks?.onAnchorChanged(node, { ...node.anchor })
          }
        }
      }
    }

    for (const note of completed) {
      this.callbacks?.onCompleted(note)
    }
  }

  private render(): void {
    const ctx = this.ctx
    const cssW = this.viewportWidth
    const cssH = this.viewportHeight

    // The background is rendered in CSS-pixel space so it always covers the
    // viewport. Notes live in the engine's logical coordinate space; apply
    // the same scale/offset used by screenToLogical before drawing them.
    // DPR only affects backing-store sharpness and must not change hit tests.
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    drawBackground(ctx, cssW, cssH)
    ctx.setTransform(
      this.dpr * this.scale,
      0,
      0,
      this.dpr * this.scale,
      this.dpr * this.offsetX,
      this.dpr * this.offsetY,
    )

    for (const node of this.nodesInZOrder()) {
      if (node.tearProgress >= 1) continue

      const rect = this.renderRect(node)
      const rotation =
        node.renderOffset.rotation +
        (node.interactionState === 'tear' ? tearPeelRotation(node.tearProgress) : 0)
      const drop = node.interactionState === 'tear' ? tearDropOffset(node.tearProgress) : 0

      drawNote(
        ctx,
        { x: rect.x, y: rect.y + drop, width: rect.width, height: rect.height },
        node.model.text,
        {
          style: noteStyleFor(node.model.color),
          rotation,
          tearProgress: node.tearProgress,
          interacting: node.isInteracting,
          tearHandleHeight: this.tearHandleHeight,
          showTearHandle: true,
          seed: node.model.motionSeed,
        },
      )
    }
  }

  // ---------------------------------------------------------------- helpers

  private updateTransform(): void {
    const rect = this.canvas.getBoundingClientRect()
    this.viewportWidth = rect.width
    this.viewportHeight = rect.height
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr))
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr))
    this.scale = Math.min(rect.width / LOGICAL_WIDTH, rect.height / LOGICAL_HEIGHT)
    this.offsetX = (rect.width - LOGICAL_WIDTH * this.scale) / 2
    this.offsetY = (rect.height - LOGICAL_HEIGHT * this.scale) / 2
  }

  private screenToLogical(px: number, py: number): Vector2 {
    return {
      x: (px - this.offsetX) / this.scale,
      y: (py - this.offsetY) / this.scale,
    }
  }

  private renderRect(node: NoteNode): Rect {
    const pos = node.anchor
    return {
      x: pos.x - this.noteWidth / 2 + node.renderOffset.x,
      y: pos.y - this.noteHeight / 2 + node.renderOffset.y,
      width: this.noteWidth,
      height: this.noteHeight,
    }
  }

  private nodesInZOrder(): NoteNode[] {
    return [...this.nodes.values()].sort(
      (a, b) =>
        (a.isInteracting ? 1000 : 0) + a.sortIndex - ((b.isInteracting ? 1000 : 0) + b.sortIndex),
    )
  }

  private driftParamsFor(node: NoteNode): DriftParams {
    let params = this.driftParams.get(node.id)
    if (!params) {
      params = driftParamsFromSeed(node.model.motionSeed, this.driftStrength)
      this.driftParams.set(node.id, params)
    }
    return params
  }

  private layoutOptions(): LayoutOptions {
    return {
      logicalWidth: LOGICAL_WIDTH,
      logicalHeight: LOGICAL_HEIGHT,
      noteWidth: NOTE_WIDTH,
      noteHeight: NOTE_HEIGHT,
      gap: NOTE_GAP,
      padding: NOTE_PADDING,
    }
  }

  private triggerReflow(): void {
    const targets = computeReflowTargets([...this.nodes.values()], this.layoutOptions())
    for (const target of targets) {
      const node = this.nodes.get(target.id)
      if (!node || node.isInteracting) continue
      if (
        Math.abs(node.anchor.x - target.to.x) < 1 &&
        Math.abs(node.anchor.y - target.to.y) < 1
      ) {
        continue
      }
      node.reflowFrom = { ...node.anchor }
      node.reflowTo = { ...target.to }
      node.reflowStart = performance.now()
      node.reflowDuration = DEFAULT_REFLOW_DURATION
    }
  }

  // ---------------------------------------------------------------- input

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    this.canvas.addEventListener('pointermove', this.onPointerMove)
    this.canvas.addEventListener('pointerup', this.onPointerUp)
    this.canvas.addEventListener('pointercancel', this.onPointerCancel)
    window.addEventListener('resize', this.onResize)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.onResize)
      this.resizeObserver.observe(this.canvas)
    }
  }

  private unbindEvents(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel)
    window.removeEventListener('resize', this.onResize)
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
  }

  private onResize = (): void => {
    this.updateTransform()
  }

  private toPointerPoint(e: PointerEvent): PointerPoint {
    const rect = this.canvas.getBoundingClientRect()
    const logical = this.screenToLogical(e.clientX - rect.left, e.clientY - rect.top)
    return { x: logical.x, y: logical.y, id: e.pointerId }
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.controller.onPointerDown(this.toPointerPoint(e))
    if (this.controller.activePointer !== null) {
      this.canvas.setPointerCapture(e.pointerId)
      this.callbacks?.onInteractionChange?.(true)
    }
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (this.controller.activePointer === null) return
    this.controller.onPointerMove(this.toPointerPoint(e))
  }

  private onPointerUp = (e: PointerEvent): void => {
    if (this.controller.activePointer === null) return
    this.controller.onPointerUp(this.toPointerPoint(e))
    this.callbacks?.onInteractionChange?.(false)
  }

  private onPointerCancel = (): void => {
    this.controller.onPointerCancel()
    this.callbacks?.onInteractionChange?.(false)
  }
}
