import { prisma } from "@/lib/prisma"
import type { ActivityAction } from "@/types"

export async function logActivity(data: {
  userId?: string
  userEmail?: string
  action: ActivityAction
  detail?: Record<string, unknown>
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: data.userId ?? null,
        userEmail: data.userEmail ?? null,
        action: data.action,
        detail: data.detail ? (data.detail as object) : undefined,
      },
    })
  } catch {
    // Best-effort: never throw — logging must not break the main action
  }
}
