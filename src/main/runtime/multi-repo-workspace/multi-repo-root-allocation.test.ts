import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { allocateMemberDirNames, allocateMultiRepoRoot } from './multi-repo-root-allocation'

describe('allocateMultiRepoRoot', () => {
  let workspaceDir: string

  beforeEach(async () => {
    workspaceDir = await mkdtemp(join(tmpdir(), 'multi-repo-root-'))
  })

  afterEach(async () => {
    await rm(workspaceDir, { recursive: true, force: true })
  })

  it('creates the root named after the workspace', async () => {
    const root = await allocateMultiRepoRoot(workspaceDir, 'checkout-fix')

    expect(root).toBe(join(workspaceDir, 'checkout-fix'))
    expect(existsSync(root)).toBe(true)
  })

  it('suffixes a taken name instead of reusing the folder', async () => {
    const first = await allocateMultiRepoRoot(workspaceDir, 'task')
    const second = await allocateMultiRepoRoot(workspaceDir, 'task')
    const third = await allocateMultiRepoRoot(workspaceDir, 'task')

    expect([first, second, third]).toEqual([
      join(workspaceDir, 'task'),
      join(workspaceDir, 'task-2'),
      join(workspaceDir, 'task-3')
    ])
  })

  it('creates a workspace directory that does not exist yet', async () => {
    const missing = join(workspaceDir, 'not', 'yet')

    expect(await allocateMultiRepoRoot(missing, 'task')).toBe(join(missing, 'task'))
  })

  it('refuses a relative workspace directory', async () => {
    await expect(allocateMultiRepoRoot('relative/dir', 'task')).rejects.toMatchObject({
      code: 'multi_repo_root_unavailable'
    })
  })

  it('refuses a name with nothing usable in it', async () => {
    await expect(allocateMultiRepoRoot(workspaceDir, '..')).rejects.toThrow('Invalid worktree name')
  })
})

describe('allocateMemberDirNames', () => {
  it('names each member after its repo folder', () => {
    expect(allocateMemberDirNames(['/repos/web', '/repos/api'])).toEqual(['web', 'api'])
  })

  it('drops a bare-repo suffix and reads Windows separators', () => {
    expect(allocateMemberDirNames(['/repos/app.git', 'C:\\repos\\tools'])).toEqual(['app', 'tools'])
  })

  it('keeps names apart when they differ only by case', () => {
    const names = allocateMemberDirNames(['/a/web', '/b/Web', '/c/web'])

    expect(names[0]).toBe('web')
    expect(new Set(names.map((name) => name.toLowerCase())).size).toBe(3)
    expect(names[2]).toBe('web-3')
  })

  it('ignores a trailing separator', () => {
    expect(allocateMemberDirNames(['/repos/web/'])).toEqual(['web'])
  })
})
