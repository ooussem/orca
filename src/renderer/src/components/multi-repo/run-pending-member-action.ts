import type React from 'react'
import { toast } from 'sonner'

/**
 * Runs one member action while its id sits in the pending set; a failure surfaces as a toast.
 * Module-level because React Compiler does not compile a component holding try/finally.
 */
export async function runPendingMemberAction(
  memberId: string,
  setPending: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>,
  run: () => Promise<unknown>
): Promise<void> {
  setPending((current) => new Set(current).add(memberId))
  try {
    await run()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : String(error))
  } finally {
    setPending((current) => {
      const next = new Set(current)
      next.delete(memberId)
      return next
    })
  }
}
