import { describe, expect, it } from 'vitest'
import type { MultiRepoWorkspace } from '../multi-repo-workspace'
import {
  composerDataForProjectGroup,
  getMultiRepoSystemGroupIds,
  isMultiRepoSystemProjectGroup
} from './multi-repo-system-group'

const multiRepo: MultiRepoWorkspace = {
  version: 1,
  executionHostId: 'local',
  rootOwnedByOrca: true,
  members: []
}
const system = { id: 'system', name: 'Workspaces', createdFrom: 'manual' } as const
const userNamed = { id: 'mine', name: 'Workspaces', createdFrom: 'manual' } as const
const scanned = { id: 'scanned', name: 'Workspaces', createdFrom: 'folder-scan' } as const
const other = { id: 'other', name: 'Platform', createdFrom: 'manual' } as const

describe('isMultiRepoSystemProjectGroup', () => {
  it('recognises the reserved group once it holds a multi-repo workspace', () => {
    expect(isMultiRepoSystemProjectGroup(system, true)).toBe(true)
  })

  it('leaves a group the user named "Workspaces" alone while it holds none', () => {
    expect(isMultiRepoSystemProjectGroup(userNamed, false)).toBe(false)
  })

  it('needs both the reserved name and manual creation', () => {
    expect(isMultiRepoSystemProjectGroup(other, true)).toBe(false)
    expect(isMultiRepoSystemProjectGroup(scanned, true)).toBe(false)
  })
})

describe('getMultiRepoSystemGroupIds', () => {
  it('returns only the groups that are the Workspaces section', () => {
    const ids = getMultiRepoSystemGroupIds(
      [system, userNamed, scanned, other],
      [
        { projectGroupId: 'system', multiRepo },
        { projectGroupId: 'mine' },
        { projectGroupId: 'scanned', multiRepo },
        { projectGroupId: 'other', multiRepo }
      ]
    )

    expect([...ids]).toEqual(['system'])
  })

  it('is empty without any multi-repo workspace', () => {
    expect(getMultiRepoSystemGroupIds([system], [{ projectGroupId: 'system' }]).size).toBe(0)
  })
})

describe('composerDataForProjectGroup', () => {
  it('preselects nothing from the Workspaces section', () => {
    expect(composerDataForProjectGroup(system, [{ projectGroupId: 'system', multiRepo }])).toEqual({
      telemetrySource: 'sidebar'
    })
  })

  it('preselects any other group', () => {
    expect(composerDataForProjectGroup(other, [{ projectGroupId: 'system', multiRepo }])).toEqual({
      initialProjectGroupId: 'other',
      telemetrySource: 'sidebar'
    })
  })
})
