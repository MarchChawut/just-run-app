"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createPlanWizardSchema, type CreatePlanWizardInput } from "@/lib/validations"
import { generatePlan, buildLeadInWeek, DISTANCE_CONFIGS } from "@/lib/trainingEngine"
import { findTemplate } from "@/lib/planTemplates"
import { loadFormula } from "@/lib/formulaLoader"
import { TARGET_DISTANCE_LABELS, EXPERIENCE_LEVEL_LABELS } from "@/types"
import { logActivity } from "@/lib/activityLogger"
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

  const msPerWeek = 7 * 86400 * 1000

  // ── Partial first week rule ──
  // The plan begins on the user's chosen start date (never back-anchored). But
  // if that date falls mid-week and fewer than 3 training days remain in the
  // calendar week, that partial week doesn't count as a training week — it
  // becomes an uncounted lead-in week (สัปดาห์เกริ่นนำ) of easy runs, and the
  // numbered training weeks 1..N start the following week. Reserve one calendar
  // week for the lead-in so the training-week math and the race window stay honest.
  const startDow = start.getDay()
  const remainingTrainingDays = data.trainingDays.filter((d) => d >= startDow).length
  const leadInWeeks = remainingTrainingDays < 3 ? 1 : 0

  // Template-backed formula? The template is the *max* length (e.g. 22 weeks).
  // Honor the user's start date and fit the longest plan that lands on/before
  // the race (minus any lead-in week), capped at the template length and floored
  // at a sport-science minimum (16 weeks for a full marathon). Shorter plans keep
  // the race-specific back half and drop early base weeks (buildPlanFromTemplate).
  const template = findTemplate(data.targetDistance, data.level, data.trainingGoal)
  let trainingWeeks: number
  if (template) {
    const MIN_TEMPLATE_WEEKS = 16
    const availableWeeks = Math.floor((race.getTime() - start.getTime()) / msPerWeek) - leadInWeeks
    if (availableWeeks < MIN_TEMPLATE_WEEKS) {
      return {
        error: `แผน ${EXPERIENCE_LEVEL_LABELS[data.level]} · ${TARGET_DISTANCE_LABELS[data.targetDistance as TargetDistance]} ต้องเริ่มซ้อมอย่างน้อย ${MIN_TEMPLATE_WEEKS} สัปดาห์ก่อนวันแข่ง — กรุณาเลือกวันแข่งที่ไกลออกไป`,
      }
    }
    trainingWeeks = Math.min(template.weeks, availableWeeks)
  } else {
    // Clamp training weeks to distance config bounds. Beginners get a 16-week
    // floor where the distance allows it (short races stay capped at maxWeeks).
    const config = DISTANCE_CONFIGS[data.targetDistance as TargetDistance]
    const minWeeks =
      data.level === "beginner"
        ? Math.min(config.maxWeeks, Math.max(16, config.minWeeks))
        : config.minWeeks
    trainingWeeks = Math.max(minWeeks, Math.min(config.maxWeeks, data.trainingWeeks))
  }

  // Load formula config + runner profile in parallel
  const [formula, existingProfile] = await Promise.all([
    loadFormula(data.targetDistance),
    prisma.runnerProfile.findUnique({
      where: { userId: session.user.id },
      select: { age: true },
    }).catch(() => null),
  ])

  // Generate the plan
  const engineInput = {
    targetDistance: data.targetDistance as TargetDistance,
    level: data.level,
    trainingGoal: data.trainingGoal,
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
    elevationGain: data.elevationGain,
    formula,
  }

  const generatedPlan = generatePlan(engineInput)

  // Prepend the uncounted lead-in week when the first calendar week is partial.
  // trainingWeeks stays N (the lead-in is week 0, not counted); the calendar maps
  // it into the start week by array position.
  if (leadInWeeks && generatedPlan.weeks.length > 0) {
    generatedPlan.weeks = [
      buildLeadInWeek(engineInput, startDow, generatedPlan.weeks[0]),
      ...generatedPlan.weeks,
    ]
  }

  let plan
  try {
    plan = await prisma.trainingPlan.create({
      data: {
        userId: session.user.id,
        name: data.name,
        targetDistance: data.targetDistance,
        level: data.level,
        startDate: start,
        raceDate: race,
        trainingWeeks,
        projectedTime: generatedPlan.projectedFinishTime,
        elevationGain: data.elevationGain ?? null,
        planData: generatedPlan as object,
        isActive: true,
      },
    })
  } catch (e) {
    console.error("[createPlanFromWizard] trainingPlan.create failed:", e)
    return { error: "ไม่สามารถบันทึกแผนได้ — กรุณาลองใหม่" }
  }

  // Upsert RunnerProfile with wizard training params
  await prisma.runnerProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      targetDistance: data.targetDistance,
      level: data.level,
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
      elevationGain: data.elevationGain ?? null,
      pr5k: data.pr5k || null,
      pr10k: data.pr10k || null,
      prHalf: data.prHalf || null,
      prFull: data.prFull || null,
    },
    update: {
      targetDistance: data.targetDistance,
      level: data.level,
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
      elevationGain: data.elevationGain ?? null,
      pr5k: data.pr5k || null,
      pr10k: data.pr10k || null,
      prHalf: data.prHalf || null,
      prFull: data.prFull || null,
    },
  }).catch(() => null) // best-effort

  void logActivity({ userId: session.user.id, userEmail: session.user.email ?? undefined, action: "plan_created", detail: { planId: plan.id, name: data.name, targetDistance: data.targetDistance, trainingWeeks } })

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

  try {
    await prisma.trainingPlan.update({ where: { id: planId }, data: updateData })
  } catch {
    return { error: "ไม่สามารถอัปเดตแผนได้ — กรุณาลองใหม่" }
  }

  void logActivity({ userId: session.user.id, userEmail: session.user.email ?? undefined, action: "plan_updated", detail: { planId, ...updateData } })

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

  try {
    await prisma.trainingPlan.delete({ where: { id: planId } })
  } catch {
    return { error: "ไม่สามารถลบแผนได้ — กรุณาลองใหม่" }
  }

  void logActivity({ userId: session.user.id, userEmail: session.user.email ?? undefined, action: "plan_deleted", detail: { planId } })

  revalidatePath("/plan")
  revalidatePath("/dashboard")
  return { success: true }
}
