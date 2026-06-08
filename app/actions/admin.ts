"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/auth-utils"
import { getFormulaDefault } from "@/lib/formulaDefaults"
import { logActivity } from "@/lib/activityLogger"
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

  let row = null
  try {
    row = await prisma.formulaConfig.findUnique({ where: { targetDistance } })
  } catch {
    // table not created yet — fall through to defaults
  }
  const defaults = getFormulaDefault(targetDistance)
  if (!row) return { success: true, formula: defaults, isCustom: false }

  const merged: FormulaSettings = {
    ...defaults,
    ...(row.config as FormulaSettings),
    paceMultipliers: {
      ...defaults.paceMultipliers,
      ...((row.config as FormulaSettings).paceMultipliers ?? {}),
    },
    algorithmParams: {
      ...defaults.algorithmParams,
      ...((row.config as FormulaSettings).algorithmParams ?? {}),
    } as FormulaSettings["algorithmParams"],
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
    void logActivity({ userEmail: check.session.user?.email ?? undefined, action: "formula_updated", detail: { targetDistance } })
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
    void logActivity({ userEmail: check.session.user?.email ?? undefined, action: "formula_reset", detail: { targetDistance } })
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
      void logActivity({ userEmail: check.session.user?.email ?? undefined, action: "meal_updated", detail: { id, name: parsed.data.name } })
    } else {
      await prisma.mealItem.create({ data: parsed.data })
      void logActivity({ userEmail: check.session.user?.email ?? undefined, action: "meal_created", detail: { name: parsed.data.name, category: parsed.data.category } })
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
    void logActivity({ userEmail: check.session.user?.email ?? undefined, action: "meal_deleted", detail: { id } })
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

  const [userCount, planCount, activePlanCount, formulaCount, mealCount] = await Promise.all([
    prisma.user.count(),
    prisma.trainingPlan.count(),
    prisma.trainingPlan.count({ where: { isActive: true } }),
    prisma.formulaConfig.count().catch(() => 0),
    prisma.mealItem.count({ where: { isActive: true } }).catch(() => 0),
  ])

  // ActivityLog table may not exist yet (run prisma db push to create)
  const recentLogs = await prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 })
    .catch(() => [])

  return { success: true, userCount, planCount, activePlanCount, formulaCount, mealCount, recentLogs }
}

// ─── User management ───────────────────────────────────────────────────────

export async function getUsers(search?: string) {
  const check = await checkAdmin()
  if ("error" in check) return check

  const users = await prisma.user.findMany({
    where: search ? {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
      ],
    } : undefined,
    include: {
      plans: { select: { id: true, isActive: true, targetDistance: true, createdAt: true, name: true } },
      profile: { select: { targetDistance: true, intensity: true, age: true } },
      completions: { select: { id: true } },
      sessions: { select: { expires: true }, orderBy: { expires: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  return { success: true, users }
}

// ─── Activity logs ─────────────────────────────────────────────────────────

export async function getLogs(opts?: { action?: string; userId?: string; cursor?: string; limit?: number }) {
  const check = await checkAdmin()
  if ("error" in check) return check

  const limit = opts?.limit ?? 50
  try {
    const logs = await prisma.activityLog.findMany({
      where: {
        ...(opts?.action ? { action: opts.action } : {}),
        ...(opts?.userId ? { userId: opts.userId } : {}),
        ...(opts?.cursor ? { createdAt: { lt: new Date(opts.cursor) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    })

    const hasMore = logs.length > limit
    return {
      success: true,
      logs: hasMore ? logs.slice(0, limit) : logs,
      nextCursor: hasMore ? logs[limit - 1].createdAt.toISOString() : null,
    }
  } catch {
    // ActivityLog table not created yet
    return { success: true, logs: [], nextCursor: null, tableNotReady: true }
  }
}
