import {
  computeWorktreePath,
  ensurePathWithinWorkspace,
  getRuntimePathOps
} from './worktrees/paths/worktree-logic'

/** Exact path for a multi-repo member; the caller still bounds it with ensurePathWithinWorkspace. */
export function computePlacedWorktreePath(
  placement: { parentDir: string; leafName: string },
  workspaceRoot: string
): string {
  return getRuntimePathOps(placement.parentDir, workspaceRoot).join(
    placement.parentDir,
    placement.leafName
  )
}

/** A placed member lives under its group root, which a per-project base path need not contain. */
export function resolveCandidateWorktreePath(
  args: {
    repo: { path: string }
    workspaceRoot: string
    worktreePathSettings: Parameters<typeof computeWorktreePath>[2]
  },
  placement: { parentDir: string; leafName: string } | undefined,
  sanitizedName: string
): string {
  return placement
    ? ensurePathWithinWorkspace(
        computePlacedWorktreePath(placement, args.workspaceRoot),
        placement.parentDir
      )
    : ensurePathWithinWorkspace(
        computeWorktreePath(sanitizedName, args.repo.path, args.worktreePathSettings),
        args.workspaceRoot
      )
}
