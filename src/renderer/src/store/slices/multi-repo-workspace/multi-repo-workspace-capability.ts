import type { RuntimeClientTarget } from '../../../../../shared/remote-runtime/host-catalog/runtime-client-target'

/** Desktop-only build: multi-repo workspaces run on the local host; remote hosts are not served. */
export async function multiRepoWorkspaceSupportedOnTarget(
  target: RuntimeClientTarget
): Promise<boolean> {
  return target.kind === 'local'
}
