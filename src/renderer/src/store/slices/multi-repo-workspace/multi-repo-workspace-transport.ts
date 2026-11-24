import type { FolderWorkspace } from '../../../../../shared/folder-workspaces/folder-workspace-types'
import {
  MULTI_REPO_WORKSPACE_ERROR_CODES,
  MultiRepoWorkspaceError,
  type MultiRepoDeleteInspection,
  type MultiRepoDeleteResult,
  type MultiRepoWorkspaceErrorCode
} from '../../../../../shared/multi-repo-workspace'
import type { RuntimeClientTarget } from '../../../../../shared/remote-runtime/host-catalog/runtime-client-target'
import type { PreloadApi } from '../../../../../preload/api-types'

type MultiRepoApi = PreloadApi['multiRepoWorkspaces']

export type MultiRepoWorkspaceCreateArgs = Parameters<MultiRepoApi['create']>[0]
export type MultiRepoMemberArgs = Parameters<MultiRepoApi['retryMember']>[0]
export type MultiRepoWorkspaceDeleteArgs = Parameters<MultiRepoApi['delete']>[0]
type FolderWorkspaceReply = { folderWorkspace: FolderWorkspace }

export type MultiRepoWorkspaceCalls = {
  create: { params: MultiRepoWorkspaceCreateArgs; result: FolderWorkspaceReply }
  retryMember: { params: MultiRepoMemberArgs; result: FolderWorkspaceReply }
  removeMember: { params: MultiRepoMemberArgs; result: FolderWorkspaceReply }
  detachMember: { params: MultiRepoMemberArgs; result: FolderWorkspaceReply }
  attachMember: { params: MultiRepoMemberArgs; result: FolderWorkspaceReply }
  inspectDelete: { params: { folderWorkspaceId: string }; result: MultiRepoDeleteInspection }
  delete: { params: MultiRepoWorkspaceDeleteArgs; result: MultiRepoDeleteResult }
}

export type MultiRepoWorkspaceMethod = keyof MultiRepoWorkspaceCalls

const LOCAL_ERROR_PATTERN = /(multi_repo_[a-z_]+): ([\s\S]*)$/

function toErrorCode(value: string): MultiRepoWorkspaceErrorCode | null {
  return MULTI_REPO_WORKSPACE_ERROR_CODES.find((code) => code === value) ?? null
}

export function parseMultiRepoWorkspaceError(error: unknown): MultiRepoWorkspaceError | null {
  if (error instanceof MultiRepoWorkspaceError) {
    return error
  }
  const message = error instanceof Error ? error.message : ''
  const match = LOCAL_ERROR_PATTERN.exec(message)
  const code = match ? toErrorCode(match[1]) : null
  return code && match ? new MultiRepoWorkspaceError(code, match[2]) : null
}

function callLocal<M extends MultiRepoWorkspaceMethod>(
  method: M,
  params: MultiRepoWorkspaceCalls[M]['params']
): Promise<MultiRepoWorkspaceCalls[M]['result']> {
  const api = window.api.multiRepoWorkspaces
  const calls: {
    [K in MultiRepoWorkspaceMethod]: (
      p: MultiRepoWorkspaceCalls[K]['params']
    ) => Promise<MultiRepoWorkspaceCalls[K]['result']>
  } = {
    create: api.create,
    retryMember: api.retryMember,
    removeMember: api.removeMember,
    detachMember: api.detachMember,
    attachMember: api.attachMember,
    inspectDelete: api.inspectDelete,
    delete: api.delete
  }
  return calls[method](params)
}

export async function callMultiRepoWorkspace<M extends MultiRepoWorkspaceMethod>(
  target: RuntimeClientTarget,
  method: M,
  params: MultiRepoWorkspaceCalls[M]['params']
): Promise<MultiRepoWorkspaceCalls[M]['result']> {
  try {
    if (target.kind !== 'local') {
      // Desktop-only build: no RPC surface, so a remote host cannot serve these calls.
      throw new MultiRepoWorkspaceError(
        'multi_repo_capability_unsupported',
        'Multi-repo workspaces are only available on this computer.'
      )
    }
    return await callLocal(method, params)
  } catch (error) {
    throw parseMultiRepoWorkspaceError(error) ?? error
  }
}
