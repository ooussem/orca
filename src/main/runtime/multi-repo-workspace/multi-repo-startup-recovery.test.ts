import { describe, expect, it } from 'vitest'
import {
  createRecordStore,
  testFolderWorkspace,
  testMember,
  testMultiRepo
} from './multi-repo-record-test-fixtures'
import { recoverInterruptedMultiRepoMembers } from './multi-repo-startup-recovery'
import { requireMultiRepoWorkspace } from './multi-repo-workspace-record'

describe('recoverInterruptedMultiRepoMembers', () => {
  it('marks creates that were in flight as interrupted and leaves settled members alone', () => {
    const store = createRecordStore([
      testFolderWorkspace(
        'multi',
        testMultiRepo([
          testMember('queued', { state: 'queued' }),
          testMember('creating', { state: 'creating' }),
          testMember('ready', { state: 'ready' }),
          testMember('failed', { state: 'failed' })
        ])
      )
    ])

    expect(recoverInterruptedMultiRepoMembers(store)).toBe(2)
    expect(
      requireMultiRepoWorkspace(store, 'multi').multiRepo.members.map((member) => member.state)
    ).toEqual(['interrupted', 'interrupted', 'ready', 'failed'])
  })

  it('writes nothing when every member is settled', () => {
    const store = createRecordStore([
      testFolderWorkspace('plain'),
      testFolderWorkspace('multi', testMultiRepo([testMember('web'), testMember('api')]))
    ])

    expect(recoverInterruptedMultiRepoMembers(store)).toBe(0)
    expect(store.writes()).toBe(0)
  })

  it('counts members across workspaces', () => {
    const store = createRecordStore([
      testFolderWorkspace('one', testMultiRepo([testMember('a', { state: 'creating' })])),
      testFolderWorkspace('two', testMultiRepo([testMember('b', { state: 'queued' })]))
    ])

    expect(recoverInterruptedMultiRepoMembers(store)).toBe(2)
    expect(store.writes()).toBe(2)
  })
})
