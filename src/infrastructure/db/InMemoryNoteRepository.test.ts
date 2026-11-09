import { describe, expect, it } from 'vitest'
import { InMemoryNoteRepository } from './InMemoryNoteRepository'

describe('InMemoryNoteRepository', () => {
  it('creates and lists active notes in order', async () => {
    const repo = new InMemoryNoteRepository()
    const a = await repo.create({ text: 'A', anchorX: 1, anchorY: 1 })
    const b = await repo.create({ text: 'B', anchorX: 2, anchorY: 2 })

    const active = await repo.listActive()
    expect(active.map((n) => n.id)).toEqual([a.id, b.id])
  })

  it('updates text and color', async () => {
    const repo = new InMemoryNoteRepository()
    const note = await repo.create({ text: 'old' })
    const updated = await repo.update(note.id, { text: 'new', color: 'pink' })
    expect(updated.text).toBe('new')
    expect(updated.color).toBe('pink')
    expect((await repo.getById(note.id))!.text).toBe('new')
  })

  it('completes and restores', async () => {
    const repo = new InMemoryNoteRepository()
    const note = await repo.create({ text: 'task' })

    await repo.complete(note.id, 1000)
    expect(await repo.listActive()).toHaveLength(0)
    const completed = await repo.listCompleted()
    expect(completed).toHaveLength(1)
    expect(completed[0]!.completedAt).toBe(1000)

    await repo.restore(note.id)
    expect(await repo.listActive()).toHaveLength(1)
    expect(await repo.listCompleted()).toHaveLength(0)
    expect((await repo.getById(note.id))!.completedAt).toBeNull()
  })

  it('permanently deletes', async () => {
    const repo = new InMemoryNoteRepository()
    const note = await repo.create({ text: 'gone' })
    await repo.permanentlyDelete(note.id)
    expect(await repo.getById(note.id)).toBeNull()
  })

  it('throws when updating a missing note', async () => {
    const repo = new InMemoryNoteRepository()
    await expect(repo.update('nope', { text: 'x' })).rejects.toThrow()
  })

  it('orders completed notes by completion time descending', async () => {
    const repo = new InMemoryNoteRepository()
    const a = await repo.create({ text: 'A' })
    const b = await repo.create({ text: 'B' })
    await repo.complete(a.id, 2000)
    await repo.complete(b.id, 1000)
    const completed = await repo.listCompleted()
    expect(completed.map((n) => n.id)).toEqual([a.id, b.id])
  })
})
