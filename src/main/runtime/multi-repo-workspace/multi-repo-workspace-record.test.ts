import { describe, expect, it } from 'vitest'
import {
  createRecordStore,
  testFolderWorkspace,
  testMember,
  testMultiRepo
} from './multi-repo-record-test-fixtures'
import {
  listMultiRepoFolderWorkspaces,
  patchMultiRepoMember,
  requireMultiRepoMember,
  requireMultiRepoWorkspace,
  writeMultiRepoRecord
} from './multi-repo-workspace-record'

function storeWithOneOfEach() {
  return createRecordStore([
    testFolderWorkspace('plain'),
    testFolderWorkspace('multi', testMultiRepo([testMember('web'), testMember('api')]))
  ])
}

describe('listMultiRepoFolderWorkspaces', () => {
  it('lists only folder workspaces that carry a multi-repo record', () => {
    expect(listMultiRepoFolderWorkspaces(storeWithOneOfEach()).map((entry) => entry.id)).toEqual([
      'multi'
    ])
  })
})

describe('requireMultiRepoWorkspace', () => {
  it('returns the workspace with its record', () => {
    expect(requireMultiRepoWorkspace(storeWithOneOfEach(), 'multi').multiRepo.members).toHaveLength(
      2
    )
  })

  it.each(['plain', 'missing'])('refuses %s as not a multi-repo workspace', (id) => {
    expect(() => requireMultiRepoWorkspace(storeWithOneOfEach(), id)).toThrow(
      expect.objectContaining({ code: 'multi_repo_workspace_not_found' })
    )
  })
})

describe('requireMultiRepoMember', () => {
  const multiRepo = testMultiRepo([testMember('web')])

  it('finds a member by id', () => {
    expect(requireMultiRepoMember(multiRepo, 'web').dirName).toBe('web')
  })

  it('refuses an unknown member', () => {
    expect(() => requireMultiRepoMember(multiRepo, 'api')).toThrow(
      expect.objectContaining({ code: 'multi_repo_member_not_found' })
    )
  })
})

describe('writeMultiRepoRecord', () => {
  it('applies the change to the stored record', () => {
    const store = storeWithOneOfEach()

    const written = writeMultiRepoRecord(store, 'multi', (current) => ({
      ...current,
      rootOwnedByOrca: false
    }))

    expect(written?.multiRepo?.rootOwnedByOrca).toBe(false)
    expect(requireMultiRepoWorkspace(store, 'multi').multiRepo.rootOwnedByOrca).toBe(false)
  })

  it.each(['plain', 'missing'])('writes nothing for %s', (id) => {
    const store = storeWithOneOfEach()

    expect(writeMultiRepoRecord(store, id, (current) => current)).toBeNull()
    expect(store.writes()).toBe(0)
  })
})

describe('patchMultiRepoMember', () => {
  it('changes only the named member', () => {
    const store = storeWithOneOfEach()

    patchMultiRepoMember(store, 'multi', 'api', (member) => ({ ...member, state: 'failed' }))

    expect(
      requireMultiRepoWorkspace(store, 'multi').multiRepo.members.map((member) => member.state)
    ).toEqual(['ready', 'failed'])
  })

  it('leaves the record alone when the member is unknown', () => {
    const store = storeWithOneOfEach()

    patchMultiRepoMember(store, 'multi', 'nope', (member) => ({ ...member, state: 'failed' }))

    expect(
      requireMultiRepoWorkspace(store, 'multi').multiRepo.members.map((member) => member.state)
    ).toEqual(['ready', 'ready'])
  })
})
