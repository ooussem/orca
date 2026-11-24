import { describe, expect, it } from 'vitest'
import { computePlacedWorktreePath, resolveCandidateWorktreePath } from './worktree-placed-path'

const nested = {
  repo: { path: '/repos/web' },
  workspaceRoot: '/workspaces',
  worktreePathSettings: { nestWorkspaces: true, workspaceDir: '/workspaces' }
}

describe('computePlacedWorktreePath', () => {
  it('joins the member directory under the group root', () => {
    expect(
      computePlacedWorktreePath({ parentDir: '/workspaces/task', leafName: 'web' }, '/workspaces')
    ).toBe('/workspaces/task/web')
  })
})

describe('resolveCandidateWorktreePath', () => {
  it('uses the per-project folder for an ordinary worktree', () => {
    expect(resolveCandidateWorktreePath(nested, undefined, 'task')).toBe('/workspaces/web/task')
  })

  it('drops the project folder when workspaces are not nested', () => {
    const flat = {
      ...nested,
      worktreePathSettings: { nestWorkspaces: false, workspaceDir: '/workspaces' }
    }
    expect(resolveCandidateWorktreePath(flat, undefined, 'task')).toBe('/workspaces/task')
  })

  it('places a member exactly at its group root, ignoring the name', () => {
    expect(
      resolveCandidateWorktreePath(
        nested,
        { parentDir: '/workspaces/task', leafName: 'web' },
        'ignored-name'
      )
    ).toBe('/workspaces/task/web')
  })

  it('accepts a group root that the project base path does not contain', () => {
    const perProjectBase = { ...nested, workspaceRoot: '/projects/web-worktrees' }
    expect(
      resolveCandidateWorktreePath(
        perProjectBase,
        { parentDir: '/workspaces/task', leafName: 'web' },
        'task'
      )
    ).toBe('/workspaces/task/web')
  })

  it('refuses a member directory that escapes its group root', () => {
    expect(() =>
      resolveCandidateWorktreePath(
        nested,
        { parentDir: '/workspaces/task', leafName: '../other' },
        'task'
      )
    ).toThrow('Invalid worktree path')
  })

  it('refuses an ordinary worktree that escapes the workspace root', () => {
    const flat = {
      ...nested,
      worktreePathSettings: { nestWorkspaces: false, workspaceDir: '/workspaces' }
    }
    expect(() => resolveCandidateWorktreePath(flat, undefined, '../outside')).toThrow(
      'Invalid worktree path'
    )
  })
})
