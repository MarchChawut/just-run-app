import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PlanCalendarView } from "@/components/plan/PlanCalendarView"
import type { GeneratedPlan, CompletionMap } from "@/types"

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user!.id!

  const [plan, completions, profile] = await Promise.all([
    prisma.trainingPlan.findFirst({ where: { id, userId } }),
    prisma.workoutCompletion.findMany({ where: { planId: id, userId } }),
    prisma.runnerProfile.findUnique({ where: { userId }, select: { runMode: true } }),
  ])

  if (!plan) notFound()

  const planData = plan.planData as GeneratedPlan

  const completionMap: CompletionMap = Object.fromEntries(
    completions.map((c) => [
      `${c.weekNumber}-${c.dayIndex}`,
      { completion: c.completion, note: c.note },
    ])
  )

  return (
    <PlanCalendarView
      plan={plan}
      planData={planData}
      completionMap={completionMap}
      runMode={(profile?.runMode ?? "outdoor") as "outdoor" | "treadmill"}
    />
  )
}
