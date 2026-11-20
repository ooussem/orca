import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MultiRepoWorkspaceError } from '../../../../../shared/multi-repo-workspace'
import { multiRepoWorkspaceSupportedOnTarget } from './multi-repo-workspace-capability'
import { callMultiRepoWorkspace } from './multi-repo-workspace-transport'

const local = { kind: 'local' } as const
const remote = { kind: 'environment', environmentId: 'env-1' } as const

describe('callMultiRepoWorkspace', () => {
  const inspectDelete = vi.fn()

  beforeEach(() => {
    inspectDelete.mockReset()
    vi.stubGlobal('window', { api: { multiRepoWorkspaces: { inspectDelete } } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reaches the local host through the desktop bridge', async () => {
    inspectDelete.mockResolvedValue({ folderWorkspaceId: 'ws-1', members: [] })

    const result = await callMultiRepoWorkspace(local, 'inspectDelete', {
      folderWorkspaceId: 'ws-1'
    })

    expect(inspectDelete).toHaveBeenCalledWith({ folderWorkspaceId: 'ws-1' })
    expect(result).toEqual({ folderWorkspaceId: 'ws-1', members: [] })
  })

  it('refuses a remote host without touching the bridge', async () => {
    await expect(
      callMultiRepoWorkspace(remote, 'inspectDelete', { folderWorkspaceId: 'ws-1' })
    ).rejects.toMatchObject({ code: 'multi_repo_capability_unsupported' })
    expect(inspectDelete).not.toHaveBeenCalled()
  })

  it('turns the bridge error text back into a typed error', async () => {
    inspectDelete.mockRejectedValue(
      new Error("Error invoking remote method 'x': Error: multi_repo_member_locked: locked")
    )

    const failure = await callMultiRepoWorkspace(local, 'inspectDelete', {
      folderWorkspaceId: 'ws-1'
    }).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(MultiRepoWorkspaceError)
    expect(failure).toMatchObject({ code: 'multi_repo_member_locked', message: 'locked' })
  })

  it('passes an unrelated failure through unchanged', async () => {
    const boom = new Error('boom')
    inspectDelete.mockRejectedValue(boom)

    await expect(
      callMultiRepoWorkspace(local, 'inspectDelete', { folderWorkspaceId: 'ws-1' })
    ).rejects.toBe(boom)
  })
})

describe('multiRepoWorkspaceSupportedOnTarget', () => {
  it('is available on this computer only', async () => {
    expect(await multiRepoWorkspaceSupportedOnTarget(local)).toBe(true)
    expect(await multiRepoWorkspaceSupportedOnTarget(remote)).toBe(false)
  })
})
