import { describe, expect, it } from 'vitest'
import {
  MULTI_REPO_WORKSPACE_MAX_MEMBERS,
  MULTI_REPO_WORKSPACE_MIN_MEMBERS
} from '../multi-repo-workspace'
import {
  MultiRepoWorkspaceCreate,
  MultiRepoWorkspaceDelete,
  MultiRepoWorkspaceMemberSelector,
  MultiRepoWorkspaceSelector
} from './multi-repo-workspace-params'

const members = (count: number) =>
  Array.from({ length: count }, (_unused, index) => ({ repoId: `repo-${index}` }))

describe('MultiRepoWorkspaceCreate', () => {
  it('accepts a name with the minimum number of projects', () => {
    const parsed = MultiRepoWorkspaceCreate.parse({
      name: 'task',
      members: [{ repoId: 'web', branchName: 'feature/x' }, { repoId: 'api' }]
    })

    expect(parsed.name).toBe('task')
    expect(parsed.members).toEqual([
      { repoId: 'web', branchName: 'feature/x', baseRef: undefined },
      { repoId: 'api', branchName: undefined, baseRef: undefined }
    ])
  })

  it('treats an empty branch or base as not given', () => {
    const parsed = MultiRepoWorkspaceCreate.parse({
      name: 'task',
      members: [
        { repoId: 'web', branchName: '', baseRef: '' },
        { repoId: 'api', branchName: 7 }
      ]
    })

    expect(parsed.members.map((member) => member.branchName)).toEqual([undefined, undefined])
    expect(parsed.members[0].baseRef).toBeUndefined()
  })

  it.each([
    ['a missing name', { members: members(2) }],
    ['an empty name', { name: '', members: members(2) }],
    ['too few projects', { name: 'task', members: members(MULTI_REPO_WORKSPACE_MIN_MEMBERS - 1) }],
    ['too many projects', { name: 'task', members: members(MULTI_REPO_WORKSPACE_MAX_MEMBERS + 1) }],
    ['a project without an id', { name: 'task', members: [{ repoId: 'web' }, {}] }]
  ])('rejects %s', (_label, input) => {
    expect(MultiRepoWorkspaceCreate.safeParse(input).success).toBe(false)
  })

  it('accepts the maximum number of projects', () => {
    expect(
      MultiRepoWorkspaceCreate.safeParse({
        name: 'task',
        members: members(MULTI_REPO_WORKSPACE_MAX_MEMBERS)
      }).success
    ).toBe(true)
  })

  it('drops a caller-supplied path: the host derives every directory', () => {
    const parsed = MultiRepoWorkspaceCreate.parse({
      name: 'task',
      folderPath: '/etc',
      members: [
        { repoId: 'web', placement: { parentDir: '/etc', leafName: 'x' } },
        { repoId: 'api' }
      ]
    })

    expect(parsed).not.toHaveProperty('folderPath')
    expect(parsed.members[0]).not.toHaveProperty('placement')
  })
})

describe('selectors', () => {
  it('requires the workspace id', () => {
    expect(MultiRepoWorkspaceSelector.safeParse({}).success).toBe(false)
    expect(MultiRepoWorkspaceSelector.parse({ folderWorkspaceId: 'ws-1' })).toEqual({
      folderWorkspaceId: 'ws-1'
    })
  })

  it('requires the member id for member actions', () => {
    expect(MultiRepoWorkspaceMemberSelector.safeParse({ folderWorkspaceId: 'ws-1' }).success).toBe(
      false
    )
  })
})

describe('MultiRepoWorkspaceDelete', () => {
  it('needs only the workspace id', () => {
    expect(MultiRepoWorkspaceDelete.parse({ folderWorkspaceId: 'ws-1' })).toMatchObject({
      folderWorkspaceId: 'ws-1'
    })
  })

  it('caps the forced members at the workspace size limit', () => {
    const tooMany = Array.from(
      { length: MULTI_REPO_WORKSPACE_MAX_MEMBERS + 1 },
      (_unused, index) => `m${index}`
    )

    expect(
      MultiRepoWorkspaceDelete.safeParse({ folderWorkspaceId: 'ws-1', forceMemberIds: tooMany })
        .success
    ).toBe(false)
  })

  it('ignores a non-boolean runHooks instead of trusting it', () => {
    expect(
      MultiRepoWorkspaceDelete.parse({ folderWorkspaceId: 'ws-1', runHooks: 'no' }).runHooks
    ).toBeUndefined()
  })
})
