import React from 'react'
import { FolderTree } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { selectWorktreesByRepo } from '@/store/workspaces/catalog/workspace-record-fields'
import type { FolderWorkspace } from '../../../../shared/folder-workspaces/folder-workspace-types'
import { pickMemberGitStatus } from './member-git-status'
import { buildRootPanelModel } from './root-panel-model'
import { getRootPanelHeaderText } from './root-panel-copy'

/**
 * Chip on a multi-repo parent row: the repo count with every attention state spelled out, plus the
 * aggregate change count so a collapsed workspace still answers "does any repo have work?".
 * Renders nothing for plain folder workspaces.
 */
export default function MultiRepoRowBadge({
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
  const model = React.useMemo(
    () => buildRootPanelModel({ folderWorkspace, repos, worktreesByRepo, gitStatusByWorktree }),
    [folderWorkspace, repos, worktreesByRepo, gitStatusByWorktree]
  )
  if (!model) {
    return null
  }
  const { summary } = model
  // The "with changes" part is the aggregate below; the chip keeps count and problem states.
  const chipText = getRootPanelHeaderText({ ...summary, withChanges: 0 })
  return (
    <span className="inline-flex items-center gap-1.5">
      {summary.changed > 0 ? (
        <span className="text-[11px] text-muted-foreground">
          {t('auto.components.multiRepo.strip.changed', '{{count}} changed', {
            count: summary.changed,
            defaultValue_one: '{{count}} changed'
          })}
        </span>
      ) : null}
      <Badge variant="hostContext">
        <FolderTree aria-hidden="true" className="size-3" />
        {chipText}
      </Badge>
    </span>
  )
}
