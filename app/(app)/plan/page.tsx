import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PlanCard } from "@/components/plan/PlanCard"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import type { TrainingPlan } from "@prisma/client"

export default async function PlanListPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const plans: TrainingPlan[] = await prisma.trainingPlan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">แผนซ้อมวิ่ง</h1>
          <p className="text-muted-foreground">จัดการแผนการซ้อมทั้งหมด</p>
        </div>
        <Link href="/plan/new" className={buttonVariants()}>
          + สร้างแผนใหม่
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🏃</p>
          <p className="text-lg font-medium">ยังไม่มีแผนซ้อม</p>
          <p className="text-muted-foreground mt-1 mb-6">สร้างแผนซ้อมแรกของคุณเพื่อเริ่มต้น</p>
          <Link href="/plan/new" className={buttonVariants()}>
            + สร้างแผนแรก
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  )
}
