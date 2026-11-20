import type { WorkspaceRepoSelection } from '../../shared/keybindings/window-shortcut-policy'

export type UiWorkspaceRepoEventApi = {
  onSelectWorkspaceRepo: (callback: (selection: WorkspaceRepoSelection) => void) => () => void
}
