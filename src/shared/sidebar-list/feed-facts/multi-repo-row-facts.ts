import * as z from 'zod'
import type { FolderWorkspace } from '../../folder-workspaces/folder-workspace-types'
import {
  MULTI_REPO_MEMBER_FAILURE_CODES,
  MULTI_REPO_MEMBER_STATES,
  type MultiRepoWorkspace
} from '../../multi-repo-workspace'

/** What a folder row lists about its multi-repo members: enough to badge and retry, never the failure text. */
export const MultiRepoRowSummarySchema = z.object({
  members: z.array(
    z.object({
      memberId: z.string(),
      repoId: z.string(),
      dirName: z.string(),
      state: z.enum(MULTI_REPO_MEMBER_STATES),
      worktreeId: z.string().optional(),
      failureCode: z.enum(MULTI_REPO_MEMBER_FAILURE_CODES).optional()
    })
  ),
  rootOwnedByOrca: z.boolean()
})
export type MultiRepoRowSummary = z.infer<typeof MultiRepoRowSummarySchema>

/** Points a git row back at the multi-repo workspace that owns it. */
export const MultiRepoMemberRefSchema = z.object({
  folderWorkspaceId: z.string(),
  memberId: z.string()
})
export type MultiRepoMemberRef = z.infer<typeof MultiRepoMemberRefSchema>

/** Members that already own a worktree, keyed by that worktree; pending and failed members have none. */
export function indexMultiRepoMembersByWorktreeId(
  folderWorkspaces: readonly Pick<FolderWorkspace, 'id' | 'multiRepo'>[]
): Map<string, MultiRepoMemberRef> {
  const memberByWorktreeId = new Map<string, MultiRepoMemberRef>()
  for (const folderWorkspace of folderWorkspaces) {
    for (const member of folderWorkspace.multiRepo?.members ?? []) {
      if (member.worktreeId) {
        memberByWorktreeId.set(member.worktreeId, {
          folderWorkspaceId: folderWorkspace.id,
          memberId: member.memberId
        })
      }
    }
  }
  return memberByWorktreeId
}

export function toMultiRepoRowSummary(
  multiRepo: Pick<MultiRepoWorkspace, 'members' | 'rootOwnedByOrca'>
): MultiRepoRowSummary {
  return {
    rootOwnedByOrca: multiRepo.rootOwnedByOrca,
    members: multiRepo.members.map((member) => ({
      memberId: member.memberId,
      repoId: member.repoId,
      dirName: member.dirName,
      state: member.state,
      ...(member.worktreeId ? { worktreeId: member.worktreeId } : {}),
      ...(member.failure ? { failureCode: member.failure.code } : {})
    }))
  }
}
