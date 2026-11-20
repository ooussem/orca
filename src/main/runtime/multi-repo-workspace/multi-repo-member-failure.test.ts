import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MULTI_REPO_MEMBER_FAILURE_MESSAGE_MAX_LENGTH } from '../../../shared/multi-repo-workspace'
import { WorktreeCreateCollisionError } from '../../../shared/new-workspace/worktree-create-collision'
import { classifyMultiRepoMemberFailure } from './multi-repo-member-failure'
import { PlacedWorktreePathOccupiedError } from './placed-worktree-path-occupied-error'

describe('classifyMultiRepoMemberFailure', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_700_000_000_000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reports an occupied member folder', () => {
    expect(
      classifyMultiRepoMemberFailure(new PlacedWorktreePathOccupiedError('/ws/task/web'))
    ).toEqual({
      code: 'path_occupied',
      message: 'Path "/ws/task/web" is already in use.',
      at: 1_700_000_000_000
    })
  })

  it('reports a branch that already exists', () => {
    expect(
      classifyMultiRepoMemberFailure(new WorktreeCreateCollisionError('branch exists')).code
    ).toBe('branch_conflict')
  })

  it.each(['repo_not_found', 'selector_not_found', 'runtime_unavailable'])(
    'reports %s as an unavailable project',
    (message) => {
      expect(classifyMultiRepoMemberFailure(new Error(message)).code).toBe('repo_unavailable')
    }
  )

  it('reports any other error as a git failure', () => {
    expect(classifyMultiRepoMemberFailure(new Error('fatal: not a git repository'))).toMatchObject({
      code: 'git_failed',
      message: 'fatal: not a git repository'
    })
  })

  it('keeps a thrown non-error readable', () => {
    expect(classifyMultiRepoMemberFailure('plain text')).toMatchObject({
      code: 'unknown',
      message: 'plain text'
    })
  })

  it('caps the stored message', () => {
    const failure = classifyMultiRepoMemberFailure(new Error('x'.repeat(5000)))

    expect(failure.message).toHaveLength(MULTI_REPO_MEMBER_FAILURE_MESSAGE_MAX_LENGTH)
  })
})
