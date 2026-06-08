"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activityLogger"
import { z } from "zod"

const completionSchema = z.object({
  planId: z.string().min(1),
  weekNumber: z.number().int().min(1),
  dayIndex: z.number().int().min(0).max(6),
  completion: z.number().int().min(0).max(100),
  note: z.string().max(500).optional(),
})

export async function saveCompletion(input: {
  planId: string
  weekNumber: number
  dayIndex: number
  completion: number
  note?: string
}): Promise<{ success: true } | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "ไม่ได้เข้าสู่ระบบ" }

  const parsed = completionSchema.safeParse(input)
  if (!parsed.success) return { error: "ข้อมูลไม่ถูกต้อง" }

  const { planId, weekNumber, dayIndex, completion, note } = parsed.data

  // Verify plan belongs to user
  const plan = await prisma.trainingPlan.findFirst({
    where: { id: planId, userId: session.user.id },
    select: { id: true },
  })
  if (!plan) return { error: "ไม่พบแผนซ้อม" }

  await prisma.workoutCompletion.upsert({
    where: { planId_weekNumber_dayIndex: { planId, weekNumber, dayIndex } },
    create: { userId: session.user.id, planId, weekNumber, dayIndex, completion, note },
    update: { completion, note },
  })

  void logActivity({ userId: session.user.id, userEmail: session.user.email ?? undefined, action: "completion_saved", detail: { planId, weekNumber, dayIndex, completion } })

  revalidatePath(`/plan/${planId}`)
  return { success: true }
}
