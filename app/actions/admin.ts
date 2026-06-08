"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/auth-utils"
import { getFormulaDefault } from "@/lib/formulaDefaults"
import type { FormulaSettings } from "@/types"
import { z } from "zod"

async function checkAdmin() {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return { error: "Unauthorized" } as const
  }
  return { session } as const
}

// ─── Formula ───────────────────────────────────────────────────────────────

export async function getFormula(targetDistance: string) {
  const check = await checkAdmin()
  if ("error" in check) return check

  const row = await prisma.formulaConfig.findUnique({ where: { targetDistance } })
  const defaults = getFormulaDefault(targetDistance)
  if (!row) return { success: true, formula: defaults, isCustom: false }

  const merged: FormulaSettings = {
    ...defaults,
    ...(row.config as FormulaSettings),
    paceMultipliers: {
      ...defaults.paceMultipliers,
      ...((row.config as FormulaSettings).paceMultipliers ?? {}),
    },
  }
  return { success: true, formula: merged, isCustom: true, updatedAt: row.updatedAt, updatedBy: row.updatedBy }
}

export async function saveFormula(targetDistance: string, formula: FormulaSettings) {
  const check = await checkAdmin()
  if ("error" in check) return check

  try {
    await prisma.formulaConfig.upsert({
      where: { targetDistance },
      create: { targetDistance, config: formula as object, updatedBy: check.session.user?.email },
      update: { config: formula as object, updatedBy: check.session.user?.email },
    })
    revalidatePath("/admin/formula")
    return { success: true }
  } catch {
    return { error: "บันทึกไม่สำเร็จ" }
  }
}

export async function resetFormula(targetDistance: string) {
  const check = await checkAdmin()
  if ("error" in check) return check

  try {
    await prisma.formulaConfig.deleteMany({ where: { targetDistance } })
    revalidatePath("/admin/formula")
    return { success: true }
  } catch {
    return { error: "รีเซ็ตไม่สำเร็จ" }
  }
}

// ─── Meals ─────────────────────────────────────────────────────────────────

const mealSchema = z.object({
  category: z.enum(["rest", "easy", "long", "hard", "moderate"]),
  slot: z.enum(["breakfast", "lunch", "snack", "dinner"]),
  name: z.string().min(1).max(100),
  note: z.string().max(200).optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
})

export async function getMealItems() {
  const check = await checkAdmin()
  if ("error" in check) return check

  const items = await prisma.mealItem.findMany({ orderBy: [{ category: "asc" }, { slot: "asc" }, { sortOrder: "asc" }] })
  return { success: true, items }
}

export async function saveMealItem(id: string | null, data: z.infer<typeof mealSchema>) {
  const check = await checkAdmin()
  if ("error" in check) return check

  const parsed = mealSchema.safeParse(data)
  if (!parsed.success) return { error: "ข้อมูลไม่ถูกต้อง" }

  try {
    if (id) {
      await prisma.mealItem.update({ where: { id }, data: parsed.data })
    } else {
      await prisma.mealItem.create({ data: parsed.data })
    }
    revalidatePath("/admin/meals")
    return { success: true }
  } catch {
    return { error: "บันทึกไม่สำเร็จ" }
  }
}

export async function deleteMealItem(id: string) {
  const check = await checkAdmin()
  if ("error" in check) return check

  try {
    await prisma.mealItem.delete({ where: { id } })
    revalidatePath("/admin/meals")
    return { success: true }
  } catch {
    return { error: "ลบไม่สำเร็จ" }
  }
}

export async function toggleMealItem(id: string, isActive: boolean) {
  const check = await checkAdmin()
  if ("error" in check) return check

  await prisma.mealItem.update({ where: { id }, data: { isActive } }).catch(() => null)
  revalidatePath("/admin/meals")
  return { success: true }
}

// ─── Overview stats ────────────────────────────────────────────────────────

export async function getAdminStats() {
  const check = await checkAdmin()
  if ("error" in check) return check

  const [userCount, planCount, formulaCount, mealCount] = await Promise.all([
    prisma.user.count(),
    prisma.trainingPlan.count(),
    prisma.formulaConfig.count(),
    prisma.mealItem.count({ where: { isActive: true } }),
  ])
  return { success: true, userCount, planCount, formulaCount, mealCount }
}
