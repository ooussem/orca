import type { FolderWorkspace } from '../../../shared/folder-workspaces/folder-workspace-types'
import { MultiRepoWorkspaceError, type MultiRepoMember } from '../../../shared/multi-repo-workspace'
import { splitWorktreeId } from '../../../shared/worktree/id'
import { worktreeRowTarget } from '../../persistence/host-qualified-worktree-meta'
import { pathExists, recordMultiRepoMemberLineage } from './multi-repo-member-adoption'
import type { MultiRepoWorkspacePort } from './multi-repo-workspace-port'
import {
  requireMultiRepoMember,
  requireMultiRepoWorkspace,
  writeMultiRepoRecord
} from './multi-repo-workspace-record'

export async function removeMultiRepoMember(
  port: MultiRepoWorkspacePort,
  folderWorkspaceId: string,
  memberId: string
): Promise<FolderWorkspace> {
  const store = port.requireStore()
  const member = requireMultiRepoMember(
    requireMultiRepoWorkspace(store, folderWorkspaceId).multiRepo,
    memberId
  )
  const removable =
    member.state === 'failed' ||
    member.state === 'interrupted' ||
    (member.state === 'ready' && (await isMemberGone(store, member)))
  if (!removable) {
    throw new MultiRepoWorkspaceError(
      'multi_repo_member_not_removable',
      'Only failed, interrupted or missing members can be removed. Nothing on disk is deleted.'
    )
  }
  const target = member.worktreeId ? worktreeRowTarget(store, { id: member.worktreeId }) : undefined
  if (target) {
    store.removeWorktreeLineage?.(target)
  }
  const updated = writeMultiRepoRecord(store, folderWorkspaceId, (current) => ({
    ...current,
    members: current.members.filter((entry) => entry.memberId !== memberId)
  }))
  port.notifyChanged()
  return updated ?? requireMultiRepoWorkspace(store, folderWorkspaceId)
}

/** A ready member the sidebar shows as missing: its project left Orca or its worktree left the disk. */
async function isMemberGone(
  store: ReturnType<MultiRepoWorkspacePort['requireStore']>,
  member: MultiRepoMember
): Promise<boolean> {
  const worktreePath = member.worktreeId ? splitWorktreeId(member.worktreeId)?.worktreePath : null
  return (
    !store.getRepos().some((repo) => repo.id === member.repoId) ||
    !worktreePath ||
    !(await pathExists(worktreePath))
  )
}

export async function detachMultiRepoMember(
  port: MultiRepoWorkspacePort,
  folderWorkspaceId: string,
  memberId: string
): Promise<FolderWorkspace> {
  const store = port.requireStore()
  const workspace = requireMultiRepoWorkspace(store, folderWorkspaceId)
  const member = requireMultiRepoMember(workspace.multiRepo, memberId)
  if (member.state !== 'ready' || !member.worktreeId) {
    throw new MultiRepoWorkspaceError(
      'multi_repo_member_not_detachable',
      'Only a ready member can be removed from the workspace.'
    )
  }
  const target = worktreeRowTarget(store, { id: member.worktreeId })
  if (target) {
    store.removeWorktreeLineage?.(target)
  }
  const updated = writeMultiRepoRecord(store, folderWorkspaceId, (current) => ({
    ...current,
    members: current.members.filter((entry) => entry.memberId !== memberId),
    detachedMembers: [...(current.detachedMembers ?? []), member]
  }))
  port.notifyChanged()
  return updated ?? requireMultiRepoWorkspace(store, folderWorkspaceId)
}

export async function attachMultiRepoMember(
  port: MultiRepoWorkspacePort,
  folderWorkspaceId: string,
  memberId: string
): Promise<FolderWorkspace> {
  const store = port.requireStore()
  const workspace = requireMultiRepoWorkspace(store, folderWorkspaceId)
  const member = workspace.multiRepo.detachedMembers?.find((entry) => entry.memberId === memberId)
  const worktreeId = member?.worktreeId
  if (!member || !worktreeId || !store.getWorktreeMeta(worktreeId)) {
    throw new MultiRepoWorkspaceError(
      'multi_repo_member_not_attachable',
      'This workspace cannot be restored; its worktree no longer exists.'
    )
  }
  recordMultiRepoMemberLineage(port, workspace, worktreeId, member.worktreeInstanceId)
  const updated = writeMultiRepoRecord(store, folderWorkspaceId, (current) => ({
    ...current,
    members: [...current.members, member],
    detachedMembers: (current.detachedMembers ?? []).filter((entry) => entry.memberId !== memberId)
  }))
  port.notifyChanged()
  return updated ?? requireMultiRepoWorkspace(store, folderWorkspaceId)
}
