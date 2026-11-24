import { describe, expect, it } from 'vitest'
import type { MultiRepoMember, MultiRepoWorkspace } from '../../multi-repo-workspace'
import {
  indexMultiRepoMembersByWorktreeId,
  MultiRepoRowSummarySchema,
  toMultiRepoRowSummary
} from './multi-repo-row-facts'

function member(memberId: string, overrides: Partial<MultiRepoMember> = {}): MultiRepoMember {
  return {
    memberId,
    repoId: `repo-${memberId}`,
    dirName: memberId,
    branchName: 'task',
    state: 'ready',
    attempts: 1,
    ...overrides
  }
}

function multiRepo(members: MultiRepoMember[]): MultiRepoWorkspace {
  return { version: 1, executionHostId: 'local', rootOwnedByOrca: true, members }
}

describe('indexMultiRepoMembersByWorktreeId', () => {
  it('maps each created worktree to its workspace and member', () => {
    const index = indexMultiRepoMembersByWorktreeId([
      { id: 'ws-1', multiRepo: multiRepo([member('web', { worktreeId: 'wt-web' })]) },
      { id: 'ws-2', multiRepo: multiRepo([member('api', { worktreeId: 'wt-api' })]) }
    ])

    expect(Object.fromEntries(index)).toEqual({
      'wt-web': { folderWorkspaceId: 'ws-1', memberId: 'web' },
      'wt-api': { folderWorkspaceId: 'ws-2', memberId: 'api' }
    })
  })

  it('skips members without a worktree and plain folder workspaces', () => {
    const index = indexMultiRepoMembersByWorktreeId([
      { id: 'plain' },
      { id: 'ws-1', multiRepo: multiRepo([member('web', { state: 'failed' })]) }
    ])

    expect(index.size).toBe(0)
  })
})

describe('toMultiRepoRowSummary', () => {
  it('carries what a row shows and the failure code, never the failure text', () => {
    const summary = toMultiRepoRowSummary(
      multiRepo([
        member('web', { worktreeId: 'wt-web' }),
        member('api', {
          state: 'failed',
          failure: { code: 'branch_conflict', message: 'secret/path detail', at: 1 }
        })
      ])
    )

    expect(summary).toEqual({
      rootOwnedByOrca: true,
      members: [
        {
          memberId: 'web',
          repoId: 'repo-web',
          dirName: 'web',
          state: 'ready',
          worktreeId: 'wt-web'
        },
        {
          memberId: 'api',
          repoId: 'repo-api',
          dirName: 'api',
          state: 'failed',
          failureCode: 'branch_conflict'
        }
      ]
    })
    expect(JSON.stringify(summary)).not.toContain('secret/path detail')
  })

  it('produces a summary the row schema accepts', () => {
    const summary = toMultiRepoRowSummary(multiRepo([member('web', { state: 'interrupted' })]))

    expect(MultiRepoRowSummarySchema.parse(summary)).toEqual(summary)
  })
})

describe('MultiRepoRowSummarySchema', () => {
  it('rejects a member state this build does not know', () => {
    const result = MultiRepoRowSummarySchema.safeParse({
      rootOwnedByOrca: true,
      members: [{ memberId: 'web', repoId: 'r', dirName: 'web', state: 'exploded' }]
    })

    expect(result.success).toBe(false)
  })
})
