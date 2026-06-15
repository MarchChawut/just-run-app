"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activityLogger"
import { TARGET_DISTANCE_VALUES } from "@/lib/validations"
import { z } from "zod"

const profileSchema = z.object({
  age: z.coerce.number().int().min(10).max(100).optional(),
  targetDistance: z.enum(TARGET_DISTANCE_VALUES),
  daysPerWeek: z.coerce.number().int().min(2).max(7).default(4),
  trainingDays: z.string().default("[]"),
  longRunDay: z.coerce.number().int().min(0).max(6).default(6),
  sessionTime: z.enum(["morning", "evening", "both"]).default("evening"),
  morningMinutes: z.coerce.number().int().optional(),
  eveningMinutes: z.coerce.number().int().optional(),
  intensity: z.enum(["gentle", "normal", "challenging", "elite"]).default("normal"),
  terrainType: z.enum(["road", "trail", "track", "mixed"]).default("road"),
  elevationGain: z.coerce.number().int().min(0).max(15000).optional(),
  pr5k: z.string().optional(),
  pr10k: z.string().optional(),
  prHalf: z.string().optional(),
  prFull: z.string().optional(),
})

export async function upsertProfile(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: "ไม่ได้เข้าสู่ระบบ" }

  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    raw[key] = value === "" ? undefined : value
  }

  const parsed = profileSchema.safeParse(raw)
  if (!parsed.success) return { error: "ข้อมูลไม่ถูกต้อง: " + JSON.stringify(parsed.error.flatten().fieldErrors) }

  const data = {
    ...parsed.data,
    trainingDays: parsed.data.trainingDays,
    conditions: "[]",
    shoes: "[]",
  }

  await prisma.runnerProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  })

  void logActivity({ userId: session.user.id, userEmail: session.user.email ?? undefined, action: "profile_updated", detail: { targetDistance: parsed.data.targetDistance, intensity: parsed.data.intensity, terrainType: parsed.data.terrainType } })

  revalidatePath("/profile")
  revalidatePath("/dashboard")
  return { success: true }
}
