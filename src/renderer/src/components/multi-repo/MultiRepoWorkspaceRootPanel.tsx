import React from 'react'
import { AlertTriangle, Check, CircleDashed, FolderX, LoaderCircle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store'
import { resolveMultiRepoExecutionHostId } from '@/lib/multi-repo-execution-host'
import { useTranslate } from '@/i18n/use-translate'
import { activateWorkspaceRepoEntry } from '@/lib/multi-repo-workspace-repo-navigation'
import { selectWorktreesByRepo } from '@/store/workspaces/catalog/workspace-record-fields'
import { deleteFolderWorkspaceUnlessUnsaved } from '@/components/sidebar/workspace-actions/deletion/folder-workspace-delete'
import type { MultiRepoMemberAction } from '@/store/slices/multi-repo-workspace/multi-repo-workspace-contract'
import type { FolderWorkspace } from '../../../../shared/folder-workspaces/folder-workspace-types'
import { pickMemberGitStatus } from './member-git-status'
import { buildRootPanelModel, type RootPanelRow, type RootPanelRowStatus } from './root-panel-model'
import { runPendingMemberAction } from './run-pending-member-action'
import {
  getNotCreatedNote,
  getRootPanelHeaderText,
  getRootPanelStatusDetail,
  getRootPanelStatusText
} from './root-panel-copy'

function StatusIcon({ status }: { status: RootPanelRowStatus }): React.JSX.Element {
  // Icons are decorative; the status text beside them carries the state.
  switch (status.kind) {
    case 'creating':
      return (
        <LoaderCircle
          aria-hidden="true"
          className="size-3.5 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
        />
      )
    case 'queued':
      return <CircleDashed aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
    case 'ready':
      return <Check aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
    case 'missing':
    case 'project_removed':
      return <FolderX aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
    case 'failed':
    case 'interrupted':
      return <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0 text-destructive" />
  }
}

export default function MultiRepoWorkspaceRootPanel({
  folderWorkspace
}: {
  folderWorkspace: FolderWorkspace
}): React.JSX.Element | null {
  const t = useTranslate()
  const repos = useAppStore((state) => state.repos)
  const worktreesByRepo = useAppStore((state) => selectWorktreesByRepo(state))
  const gitStatusByWorktree = useAppStore(
    useShallow((state) => pickMemberGitStatus(state.gitStatusByWorktree, [folderWorkspace]))
  )
  const runMemberAction = useAppStore((state) => state.runMultiRepoMemberAction)
  const [pendingMemberIds, setPendingMemberIds] = React.useState<ReadonlySet<string>>(new Set())

  const model = React.useMemo(
    () => buildRootPanelModel({ folderWorkspace, repos, worktreesByRepo, gitStatusByWorktree }),
    [folderWorkspace, repos, worktreesByRepo, gitStatusByWorktree]
  )
  const executionHostId = resolveMultiRepoExecutionHostId(folderWorkspace)

  const runAction = React.useCallback(
    (action: MultiRepoMemberAction, memberId: string): Promise<void> =>
      runPendingMemberAction(memberId, setPendingMemberIds, () =>
        runMemberAction(action, {
          folderWorkspaceId: folderWorkspace.id,
          memberId,
          ...(executionHostId ? { executionHostId } : {})
        })
      ),
    [executionHostId, folderWorkspace.id, runMemberAction]
  )

  if (!model) {
    return null
  }
  const retryAll = (): void => {
    for (const row of model.rows) {
      if (row.canRetry) {
        void runAction('retryMember', row.memberId)
      }
    }
  }
  const headerText = getRootPanelHeaderText(model.summary)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="border-b border-border px-4 py-3">
        <div className="truncate text-sm font-medium text-foreground">{folderWorkspace.name}</div>
        <div className="mt-1 text-xs text-muted-foreground">{headerText}</div>
      </div>
      {/* One polite region so screen readers hear state changes without a toast per repo. */}
      <div role="status" className="sr-only">
        {model.rows.map((row) => `${row.label}: ${getRootPanelStatusText(row.status)}`).join('. ')}
      </div>

      {model.rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="text-sm font-medium text-foreground">
            {t('auto.components.multiRepo.root.emptyTitle', 'No repos in this workspace')}
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="mt-3"
            onClick={() =>
              void deleteFolderWorkspaceUnlessUnsaved(
                useAppStore.getState,
                folderWorkspace.id,
                executionHostId
              )
            }
          >
            {t('auto.components.multiRepo.root.deleteWorkspace', 'Delete workspace')}
          </Button>
        </div>
      ) : (
        <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto py-2">
          {model.notCreatedLabels.length > 0 ? (
            <p className="px-4 pb-2 text-xs text-muted-foreground">
              {getNotCreatedNote(model.notCreatedLabels)}
            </p>
          ) : null}
          {model.retryAllCount > 1 ? (
            <div className="px-4 pb-2">
              <Button type="button" variant="outline" size="xs" onClick={retryAll}>
                <RotateCw />
                {t('auto.components.multiRepo.root.retryAll', 'Retry all')}
              </Button>
            </div>
          ) : null}
          <ul>
            {model.rows.map((row) => (
              <RootPanelRowItem
                key={row.memberId}
                row={row}
                pending={pendingMemberIds.has(row.memberId)}
                onOpen={() =>
                  row.openKey && activateWorkspaceRepoEntry(row.openKey, folderWorkspace)
                }
                onRetry={() => void runAction('retryMember', row.memberId)}
                onRemove={() => void runAction('removeMember', row.memberId)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function RootPanelRowItem({
  row,
  pending,
  onOpen,
  onRetry,
  onRemove
}: {
  row: RootPanelRow
  pending: boolean
  onOpen: () => void
  onRetry: () => void
  onRemove: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const statusText = getRootPanelStatusText(row.status)
  const statusDetail = getRootPanelStatusDetail(row.status)
  const content = (
    <>
      <StatusIcon status={row.status} />
      <span className="min-w-0 truncate text-sm text-foreground">{row.label}</span>
      <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
        {row.branchName}
      </span>
      {statusText ? (
        <span
          className="ml-auto min-w-0 truncate text-xs text-muted-foreground"
          title={statusDetail}
        >
          {statusText}
        </span>
      ) : null}
    </>
  )
  return (
    <li className="flex items-center gap-2 px-4 py-1.5">
      {row.openKey ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-w-0 flex-1 justify-start"
          aria-label={t('auto.components.multiRepo.root.open', 'Open {{repo}}', {
            repo: row.label
          })}
          onClick={onOpen}
        >
          {content}
        </Button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">{content}</div>
      )}
      {row.canRetry ? (
        <Button type="button" variant="ghost" size="xs" disabled={pending} onClick={onRetry}>
          {pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : null}
          {t('auto.components.multiRepo.root.retry', 'Retry')}
        </Button>
      ) : null}
      {row.canRemove ? (
        <Button type="button" variant="ghost" size="xs" disabled={pending} onClick={onRemove}>
          {t('auto.components.multiRepo.root.removeFromWorkspace', 'Remove from workspace')}
        </Button>
      ) : null}
    </li>
  )
}
