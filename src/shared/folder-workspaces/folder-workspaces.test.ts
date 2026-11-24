import { describe, expect, it } from 'vitest'
import { normalizeFolderWorkspaces } from './folder-workspaces'
import type { ProjectGroup } from '../project/groups/project-group-types'

const folderGroup: ProjectGroup = {
  id: 'group-1',
  name: 'Projects',
  parentPath: '/tmp/projects',
  connectionId: null,
  parentGroupId: null,
  createdFrom: 'manual',
  tabOrder: 0,
  isCollapsed: false,
  color: null,
  createdAt: 0,
  updatedAt: 0
}

describe('normalizeFolderWorkspaces multi-repo salvage', () => {
  const worktreeId = 'repo-a::/tmp/projects/ws/api'
  const base = {
    id: 'ws-multi',
    projectGroupId: 'group-1',
    name: 'Multi',
    folderPath: '/tmp/projects/ws'
  }

  it('keeps a worktree-owning member that lost required fields as interrupted', () => {
    const [workspace] = normalizeFolderWorkspaces(
      [
        {
          ...base,
          multiRepo: {
            version: 1,
            executionHostId: 'local',
            rootOwnedByOrca: true,
            members: [{ memberId: 'm1', state: 'ready', worktreeId }]
          }
        }
      ],
      [folderGroup]
    )

    expect(workspace.multiRepo?.members).toEqual([
      expect.objectContaining({
        memberId: 'm1',
        repoId: 'repo-a',
        dirName: 'api',
        branchName: 'api',
        state: 'interrupted',
        worktreeId
      })
    ])
  })

  it('salvages members when the outer multiRepo record is invalid', () => {
    const [workspace] = normalizeFolderWorkspaces(
      [{ ...base, multiRepo: { version: 2, members: [{ worktreeId }] } }],
      [folderGroup]
    )

    expect(workspace.multiRepo?.executionHostId).toBe('local')
    expect(workspace.multiRepo?.members).toEqual([
      expect.objectContaining({ memberId: `salvaged:${worktreeId}`, worktreeId })
    ])
  })

  it('keeps a duplicate-memberId member that owns a different worktree', () => {
    const otherId = 'repo-b::/tmp/projects/ws/web'
    const [workspace] = normalizeFolderWorkspaces(
      [
        {
          ...base,
          multiRepo: {
            version: 1,
            executionHostId: 'local',
            rootOwnedByOrca: false,
            members: [
              {
                memberId: 'm1',
                repoId: 'repo-a',
                dirName: 'api',
                branchName: 'a',
                state: 'ready',
                worktreeId
              },
              {
                memberId: 'm1',
                repoId: 'repo-b',
                dirName: 'web',
                branchName: 'b',
                state: 'ready',
                worktreeId: otherId
              }
            ]
          }
        }
      ],
      [folderGroup]
    )

    expect(workspace.multiRepo?.members.map((member) => member.worktreeId)).toEqual([
      worktreeId,
      otherId
    ])
  })

  it('still degrades to a plain folder workspace when no member owns a worktree', () => {
    const [workspace] = normalizeFolderWorkspaces(
      [{ ...base, multiRepo: { version: 2, members: [{ memberId: 'm1' }] } }],
      [folderGroup]
    )

    expect(workspace.multiRepo).toBeUndefined()
  })
})
