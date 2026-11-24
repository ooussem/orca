import type { OrcaRuntimeService } from '../orca-runtime'
import { queueWorkspaceDelete } from '../workspaces/lifecycle/workspace-lifecycle-commands'
import { recoverInterruptedMultiRepoMembers } from './multi-repo-startup-recovery'
import { MultiRepoWorkspaceService } from './multi-repo-workspace-service'
import type { MultiRepoWorkspacePort } from './multi-repo-workspace-port'

export function createMultiRepoWorkspacePort(runtime: OrcaRuntimeService): MultiRepoWorkspacePort {
  return {
    requireStore: () => runtime.requireStore(),
    createProjectGroup: (input) => runtime.createProjectGroup(input),
    createFolderWorkspace: async (input) =>
      (await runtime.createFolderWorkspace(input)).folderWorkspace,
    // Why: the parent goes after its members are already removed, and the delete dialog has
    // listed the root's unsaved files as discarded; refusing here would strand an empty workspace.
    deleteFolderWorkspace: (id) =>
      runtime.deleteFolderWorkspace(id, { discardUnsavedDrafts: true }),
    createWorktree: (args) => runtime.createManagedWorktree(args),
    removeWorktree: (worktreeId, removal) =>
      queueWorkspaceDelete(
        runtime,
        `id:${worktreeId}`,
        undefined,
        { ...removal, allowUnverifiedPtyStop: false },
        (queued) =>
          runtime.removeManagedWorktree(`id:${worktreeId}`, {
            ...queued,
            waitForBackgroundRemoval: true
          })
      ),
    listDetectedWorktrees: (repoId) => runtime.listDetectedManagedWorktrees(repoId),
    notifyChanged: () => runtime.publishReposChanged()
  }
}

const servicesByRuntime = new WeakMap<OrcaRuntimeService, MultiRepoWorkspaceService>()

export function getMultiRepoWorkspaceService(
  runtime: OrcaRuntimeService
): MultiRepoWorkspaceService {
  let service = servicesByRuntime.get(runtime)
  if (!service) {
    // Runs once per runtime, before this process can start a create: anything still in flight died with the last one.
    recoverInterruptedMultiRepoMembers(runtime.requireStore())
    service = new MultiRepoWorkspaceService(createMultiRepoWorkspacePort(runtime))
    servicesByRuntime.set(runtime, service)
  }
  return service
}
