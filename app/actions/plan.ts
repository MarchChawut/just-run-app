"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createPlanWizardSchema, TARGET_DISTANCE_VALUES, type CreatePlanWizardInput } from "@/lib/validations"
import { generatePlan, DISTANCE_CONFIGS } from "@/lib/trainingEngine"
import type { TargetDistance } from "@/types"

export async function createPlanFromWizard(input: CreatePlanWizardInput) {
  const session = await auth()
  if (!session?.user?.id) return { error: "ไม่ได้เข้าสู่ระบบ" }

  const parsed = createPlanWizardSchema.safeParse(input)
  if (!parsed.success) return { error: "ข้อมูลไม่ถูกต้อง" }

  const data = parsed.data
  const start = new Date(data.startDate)
  const race = new Date(data.raceDate)

  if (race <= start) return { error: "วันแข่งต้องหลังวันเริ่มซ้อม" }

  // Clamp training weeks to distance config bounds
  const config = DISTANCE_CONFIGS[data.targetDistance as TargetDistance]
  const trainingWeeks = Math.max(config.minWeeks, Math.min(config.maxWeeks, data.trainingWeeks))

  // Read existing profile age for HR zone calculations
  const existingProfile = await prisma.runnerProfile.findUnique({
    where: { userId: session.user.id },
    select: { age: true },
  }).catch(() => null)

  // Generate the plan
  const engineInput = {
    targetDistance: data.targetDistance as TargetDistance,
    trainingWeeks,
    daysPerWeek: data.daysPerWeek,
    trainingDays: data.trainingDays,
    longRunDay: data.longRunDay,
    intensity: data.intensity,
    pr5k: data.pr5k || undefined,
    pr10k: data.pr10k || undefined,
    prHalf: data.prHalf || undefined,
    prFull: data.prFull || undefined,
    age: existingProfile?.age ?? undefined,
    morningZone2: data.morningZone2,
  }

  const generatedPlan = generatePlan(engineInput)

  const plan = await prisma.trainingPlan.create({
    data: {
      userId: session.user.id,
      name: data.name,
      targetDistance: data.targetDistance,
      startDate: start,
      raceDate: race,
      trainingWeeks,
      projectedTime: generatedPlan.projectedFinishTime,
      planData: generatedPlan as object,
      isActive: true,
    },
  })

  // Upsert RunnerProfile with wizard training params
  await prisma.runnerProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      targetDistance: data.targetDistance,
      daysPerWeek: data.daysPerWeek,
      trainingDays: JSON.stringify(data.trainingDays),
      longRunDay: data.longRunDay,
      sessionTime: data.sessionTime,
      morningZone2: data.morningZone2,
      morningMinutes: data.morningMinutes,
      eveningMinutes: data.eveningMinutes,
      intensity: data.intensity,
      terrainType: data.terrainType,
      runMode: data.runMode,
      pr5k: data.pr5k || null,
      pr10k: data.pr10k || null,
      prHalf: data.prHalf || null,
      prFull: data.prFull || null,
    },
    update: {
      targetDistance: data.targetDistance,
      daysPerWeek: data.daysPerWeek,
      trainingDays: JSON.stringify(data.trainingDays),
      longRunDay: data.longRunDay,
      sessionTime: data.sessionTime,
      morningZone2: data.morningZone2,
      morningMinutes: data.morningMinutes,
      eveningMinutes: data.eveningMinutes,
      intensity: data.intensity,
      terrainType: data.terrainType,
      runMode: data.runMode,
      pr5k: data.pr5k || null,
      pr10k: data.pr10k || null,
      prHalf: data.prHalf || null,
      prFull: data.prFull || null,
    },
  }).catch(() => null) // best-effort

  revalidatePath("/plan")
  revalidatePath("/dashboard")
  return { success: true, planId: plan.id }
}

export async function updatePlan(planId: string, data: { name?: string; isActive?: boolean }) {
  const session = await auth()
  if (!session?.user?.id) return { error: "ไม่ได้เข้าสู่ระบบ" }

  const plan = await prisma.trainingPlan.findFirst({
    where: { id: planId, userId: session.user.id },
    select: { id: true },
  })
  if (!plan) return { error: "ไม่พบแผนซ้อม" }

  const updateData: { name?: string; isActive?: boolean } = {}
  if (data.name !== undefined) updateData.name = data.name.trim() || "แผนซ้อมวิ่ง"
  if (data.isActive !== undefined) updateData.isActive = data.isActive

  await prisma.trainingPlan.update({ where: { id: planId }, data: updateData })

  revalidatePath("/plan")
  revalidatePath("/dashboard")
  revalidatePath(`/plan/${planId}`)
  return { success: true }
}

export async function deletePlan(planId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "ไม่ได้เข้าสู่ระบบ" }

  const plan = await prisma.trainingPlan.findFirst({
    where: { id: planId, userId: session.user.id },
    select: { id: true },
  })
  if (!plan) return { error: "ไม่พบแผนซ้อม" }

  await prisma.trainingPlan.delete({ where: { id: planId } })

  revalidatePath("/plan")
  revalidatePath("/dashboard")
  return { success: true }
}

/** @deprecated Use createPlanFromWizard instead */
export async function createPlan(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: "ไม่ได้เข้าสู่ระบบ" }

  const name = String(formData.get("name") ?? "แผนซ้อมวิ่ง")
  const targetDistance = String(formData.get("targetDistance"))
  const startDateStr = String(formData.get("startDate") ?? "")
  const raceDateStr = String(formData.get("raceDate") ?? "")

  if (!TARGET_DISTANCE_VALUES.includes(targetDistance as TargetDistance)) {
    return { error: "ระยะทางไม่ถูกต้อง" }
  }
  if (!startDateStr || !raceDateStr) return { error: "กรุณาระบุวันที่" }

  const start = new Date(startDateStr)
  const race = new Date(raceDateStr)
  if (race <= start) return { error: "วันแข่งต้องหลังวันเริ่มซ้อม" }

  const trainingWeeks = Math.max(1, Math.round((race.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)))

  await prisma.trainingPlan.create({
    data: {
      userId: session.user.id,
      name,
      targetDistance,
      startDate: start,
      raceDate: race,
      trainingWeeks,
      planData: { weeks: [] },
      isActive: true,
    },
  })

  revalidatePath("/plan")
  revalidatePath("/dashboard")
  return { success: true }
}
