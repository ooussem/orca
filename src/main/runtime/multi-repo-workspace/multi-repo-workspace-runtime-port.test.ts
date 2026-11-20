import { describe, expect, it } from 'vitest'
import type { OrcaRuntimeService } from '../orca-runtime'
import {
  createRecordStore,
  testFolderWorkspace,
  testMember,
  testMultiRepo
} from './multi-repo-record-test-fixtures'
import { requireMultiRepoWorkspace } from './multi-repo-workspace-record'
import { getMultiRepoWorkspaceService } from './multi-repo-workspace-runtime-port'

function runtimeWith(store: ReturnType<typeof createRecordStore>): OrcaRuntimeService {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: creating the service only reads the store.
  return { requireStore: () => store } as unknown as OrcaRuntimeService
}

describe('getMultiRepoWorkspaceService', () => {
  it('recovers interrupted members once and reuses the service for a runtime', () => {
    const store = createRecordStore([
      testFolderWorkspace('multi', testMultiRepo([testMember('web', { state: 'creating' })]))
    ])
    const runtime = runtimeWith(store)

    const service = getMultiRepoWorkspaceService(runtime)

    expect(requireMultiRepoWorkspace(store, 'multi').multiRepo.members[0].state).toBe('interrupted')
    expect(getMultiRepoWorkspaceService(runtime)).toBe(service)
    expect(store.writes()).toBe(1)
  })

  it('keeps one service per runtime', () => {
    const first = getMultiRepoWorkspaceService(runtimeWith(createRecordStore([])))
    const second = getMultiRepoWorkspaceService(runtimeWith(createRecordStore([])))

    expect(first).not.toBe(second)
  })
})
