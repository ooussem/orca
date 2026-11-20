import { keybindingMatchesAction } from './keybindings/matching'
import type {
  KeybindingActionId,
  KeybindingMatchOptions,
  KeybindingOverrides
} from './keybindings/types'
import type {
  WindowShortcutAction,
  WindowShortcutInput
} from './keybindings/window-shortcut-policy'

export type WorkspaceRepoSelection = { kind: 'next' | 'previous' }

export function workspaceRepoSelectionActionId(
  selection: WorkspaceRepoSelection
): KeybindingActionId {
  return selection.kind === 'next' ? 'workspace.nextRepo' : 'workspace.previousRepo'
}

export function resolveWorkspaceRepoShortcut(
  input: WindowShortcutInput,
  platform: NodeJS.Platform,
  keybindings: KeybindingOverrides | undefined,
  options: KeybindingMatchOptions
): WindowShortcutAction | null {
  if (keybindingMatchesAction('workspace.nextRepo', input, platform, keybindings, options)) {
    return { type: 'selectWorkspaceRepo', selection: { kind: 'next' } }
  }
  if (keybindingMatchesAction('workspace.previousRepo', input, platform, keybindings, options)) {
    return { type: 'selectWorkspaceRepo', selection: { kind: 'previous' } }
  }
  return null
}
