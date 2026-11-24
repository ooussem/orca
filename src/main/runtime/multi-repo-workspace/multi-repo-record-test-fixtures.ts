import type { FolderWorkspace } from '../../../shared/folder-workspaces/folder-workspace-types'
import type { MultiRepoMember, MultiRepoWorkspace } from '../../../shared/multi-repo-workspace'
import type { MultiRepoRecordStore } from './multi-repo-workspace-record'

export function testMember(
  memberId: string,
  overrides: Partial<MultiRepoMember> = {}
): MultiRepoMember {
  return {
    memberId,
    repoId: memberId,
    dirName: memberId,
    branchName: 'task',
    state: 'ready',
    attempts: 1,
    ...overrides
  }
}

export function testMultiRepo(members: MultiRepoMember[]): MultiRepoWorkspace {
  return { version: 1, executionHostId: 'local', rootOwnedByOrca: true, members }
}

export function testFolderWorkspace(id: string, multiRepo?: MultiRepoWorkspace): FolderWorkspace {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: record helpers read only id and multiRepo.
  return { id, name: id, ...(multiRepo ? { multiRepo } : {}) } as FolderWorkspace
}

/** In-memory stand-in for the two store calls the record helpers use; `writes` counts updates. */
export function createRecordStore(workspaces: FolderWorkspace[]): MultiRepoRecordStore & {
  workspaces: FolderWorkspace[]
  writes: () => number
} {
  let writes = 0
  return {
    workspaces,
    writes: () => writes,
    getFolderWorkspaces: () => workspaces,
    updateFolderWorkspace: (id, updates) => {
      const index = workspaces.findIndex((entry) => entry.id === id)
      if (index === -1) {
        return null
      }
      writes += 1
      workspaces[index] = { ...workspaces[index], ...updates }
      return workspaces[index]
    }
  }
}
