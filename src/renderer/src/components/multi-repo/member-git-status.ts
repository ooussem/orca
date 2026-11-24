import type { FolderWorkspace } from '../../../../shared/folder-workspaces/folder-workspace-types'
import type { GitStatusEntry } from '../../../../shared/git/status/git-status-types'

type GitStatusByWorktree = Readonly<Record<string, readonly GitStatusEntry[] | undefined>>

/**
 * The git status of these workspaces' member worktrees only. Selected with useShallow, a
 * consumer re-renders when one of its own members changes, not on every worktree in the fleet.
 */
export function pickMemberGitStatus(
  gitStatusByWorktree: GitStatusByWorktree,
  folderWorkspaces: readonly FolderWorkspace[]
): GitStatusByWorktree {
  const picked: Record<string, readonly GitStatusEntry[]> = {}
  for (const folderWorkspace of folderWorkspaces) {
    for (const member of folderWorkspace.multiRepo?.members ?? []) {
      const status = member.worktreeId ? gitStatusByWorktree[member.worktreeId] : undefined
      if (member.worktreeId && status) {
        picked[member.worktreeId] = status
      }
    }
  }
  return picked
}
