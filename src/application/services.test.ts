import { describe, expect, it, vi } from 'vitest'
import { InMemoryNoteRepository } from '@/infrastructure/db/InMemoryNoteRepository'
import { NoteService } from './NoteService'
import { CompletionService } from './CompletionService'
import { WidgetSyncService } from './WidgetSyncService'
import type { SnapshotRepository } from '@/repository/SnapshotRepository'
import type { WidgetBridge } from '@/infrastructure/widget/WidgetBridge'
import type { WidgetSnapshot } from '@/domain/widget'

function makeFakes() {
  const repo = new InMemoryNoteRepository()
  let stored: string | null = null
  const snapshotRepo: SnapshotRepository = {
    write: vi.fn(async (payload: string) => {
      stored = payload
    }),
    read: vi.fn(async () => stored),
  }
  const bridge: WidgetBridge = {
    sync: vi.fn(async () => undefined),
    reload: vi.fn(async () => undefined),
    onCompletions: vi.fn(),
  }
  return { repo, snapshotRepo, bridge }
}

describe('CompletionService', () => {
  it('writes the completion first, then syncs the widget', async () => {
    const { repo, snapshotRepo, bridge } = makeFakes()
    const note = await repo.create({ text: 'task' })
    const sync = new WidgetSyncService(repo, snapshotRepo, bridge)
    const service = new CompletionService(repo, sync)

    await service.complete(note.id, 'app')

    expect(await repo.listActive()).toHaveLength(0)
    expect(await repo.listCompleted()).toHaveLength(1)
    expect(snapshotRepo.write).toHaveBeenCalled()
    expect(bridge.sync).toHaveBeenCalled()
  })

  it('does not roll back completion when widget sync fails', async () => {
    const { repo, snapshotRepo, bridge } = makeFakes()
    const note = await repo.create({ text: 'task' })
    const sync = new WidgetSyncService(repo, snapshotRepo, {
      ...bridge,
      sync: vi.fn(async () => {
        throw new Error('native widget unavailable')
      }),
    })
    const service = new CompletionService(repo, sync)

    await expect(service.complete(note.id, 'app')).resolves.toBeUndefined()
    expect(await repo.listCompleted()).toHaveLength(1)
  })

  it('restores the note back to active', async () => {
    const { repo, snapshotRepo, bridge } = makeFakes()
    const note = await repo.create({ text: 'task' })
    await repo.complete(note.id, Date.now())

    const sync = new WidgetSyncService(repo, snapshotRepo, bridge)
    const service = new CompletionService(repo, sync)
    await service.restore(note.id)

    expect(await repo.listActive()).toHaveLength(1)
  })
})

describe('NoteService', () => {
  it('delegates CRUD to the repository', async () => {
    const { repo } = makeFakes()
    const service = new NoteService(repo)

    const created = await service.create({ text: 'hello' })
    expect(created.text).toBe('hello')

    const fetched = await service.getById(created.id)
    expect(fetched?.id).toBe(created.id)

    const updated = await service.save(created.id, { text: 'hi' })
    expect(updated.text).toBe('hi')

    await service.permanentlyDelete(created.id)
    expect(await service.getById(created.id)).toBeNull()
  })
})

describe('WidgetSyncService', () => {
  it('builds a snapshot limited to max items in sort order', async () => {
    const { repo, snapshotRepo, bridge } = makeFakes()
    for (let i = 4; i >= 0; i--) {
      await repo.create({ text: `n${i}`, sortIndex: i })
    }
    const sync = new WidgetSyncService(repo, snapshotRepo, bridge)

    const snapshot = await sync.buildSnapshot(3)
    expect(snapshot.version).toBe(1)
    expect(snapshot.notes).toHaveLength(3)
    expect(snapshot.notes.map((n) => n.sortIndex)).toEqual([0, 1, 2])
    expect(snapshot.notes[0]).toHaveProperty('id')
    expect(snapshot.notes[0]).toHaveProperty('text')
    expect(snapshot.notes[0]).toHaveProperty('color')
  })

  it('syncAndReload writes the snapshot and pushes to the bridge', async () => {
    const { repo, snapshotRepo, bridge } = makeFakes()
    await repo.create({ text: 'task' })
    const sync = new WidgetSyncService(repo, snapshotRepo, bridge)

    await sync.syncAndReload()

    expect(snapshotRepo.write).toHaveBeenCalledTimes(1)
    expect(bridge.sync).toHaveBeenCalledTimes(1)
  })

  it('reconcile rebuilds when the cached snapshot is missing', async () => {
    const { repo, snapshotRepo, bridge } = makeFakes()
    await repo.create({ text: 'task' })
    const sync = new WidgetSyncService(repo, snapshotRepo, bridge)

    const writeMock = snapshotRepo.write as ReturnType<typeof vi.fn>
    const syncMock = bridge.sync as ReturnType<typeof vi.fn>

    await sync.reconcile()
    expect(writeMock).toHaveBeenCalledTimes(1)
    expect(syncMock).toHaveBeenCalledTimes(1)

    await sync.reconcile()
    expect(writeMock).toHaveBeenCalledTimes(1)
    expect(syncMock).toHaveBeenCalledTimes(1)
  })

  it('reconcile rebuilds a stale snapshot', async () => {
    const { repo, snapshotRepo, bridge } = makeFakes()
    const sync = new WidgetSyncService(repo, snapshotRepo, bridge)
    const writeMock = snapshotRepo.write as ReturnType<typeof vi.fn>

    const stale: WidgetSnapshot = {
      version: 1,
      updatedAt: 1,
      notes: [],
    }
    snapshotRepo.read = vi.fn(async () => JSON.stringify(stale))

    await sync.reconcile()
    expect(writeMock).toHaveBeenCalledTimes(1)
  })

  it('reconcile rebuilds a corrupted snapshot', async () => {
    const { repo, snapshotRepo, bridge } = makeFakes()
    await repo.create({ text: 'task' })
    const sync = new WidgetSyncService(repo, snapshotRepo, bridge)

    snapshotRepo.read = vi.fn(async () => '{not-json')
    const writeMock = snapshotRepo.write as ReturnType<typeof vi.fn>

    await sync.reconcile()
    expect(writeMock).toHaveBeenCalledTimes(1)
  })

  it('registers a completion listener and applies widget completions', async () => {
    const { repo, snapshotRepo, bridge } = makeFakes()
    const note = await repo.create({ text: 'task' })
    const sync = new WidgetSyncService(repo, snapshotRepo, bridge)
    const applied = vi.fn()
    sync.setOnApplied(applied)

    expect(bridge.onCompletions).toHaveBeenCalledTimes(1)

    const listener = (bridge.onCompletions as ReturnType<typeof vi.fn>).mock.calls[0][0] as (
      ids: string[],
    ) => void
    await listener([note.id])

    expect(await repo.listActive()).toHaveLength(0)
    expect(await repo.listCompleted()).toHaveLength(1)
    expect(snapshotRepo.write).toHaveBeenCalled()
    expect(applied).toHaveBeenCalledTimes(1)
  })

  it('applying empty completions is a no-op', async () => {
    const { repo, snapshotRepo, bridge } = makeFakes()
    const sync = new WidgetSyncService(repo, snapshotRepo, bridge)

    await sync.applyCompletions([])

    expect(snapshotRepo.write).not.toHaveBeenCalled()
  })
})
