import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { TARGET_DISTANCE_LABELS } from "@/types"

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const [plans, profile] = await Promise.all([
    prisma.trainingPlan.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.runnerProfile.findUnique({ where: { userId } }),
  ])

  const activePlan = plans[0] ?? null
  const distLabel = profile?.targetDistance
    ? (TARGET_DISTANCE_LABELS[profile.targetDistance as keyof typeof TARGET_DISTANCE_LABELS] ?? profile.targetDistance)
    : "—"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          สวัสดี, {session!.user!.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground">ภาพรวมการซ้อมวิ่งของคุณ</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">แผนซ้อมที่ใช้งาน</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{plans.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">เป้าหมาย</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{distLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">วันซ้อม/สัปดาห์</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profile?.daysPerWeek ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">แผนซ้อมล่าสุด</h2>
          <Link href="/plan" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            ดูทั้งหมด
          </Link>
        </div>

        {activePlan ? (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{activePlan.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activePlan.trainingWeeks} สัปดาห์ ·{" "}
                    {TARGET_DISTANCE_LABELS[activePlan.targetDistance as keyof typeof TARGET_DISTANCE_LABELS] ?? activePlan.targetDistance}
                  </p>
                  {activePlan.projectedTime && (
                    <p className="text-sm font-mono mt-1" style={{ color: "#e8ff4a" }}>
                      เวลาคาด {activePlan.projectedTime}
                    </p>
                  )}
                </div>
                <Badge variant="default">Active</Badge>
              </div>
              <Link
                href={`/plan/${activePlan.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 w-full")}
              >
                ดูแผนซ้อม
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 pb-6 text-center">
              <p className="text-muted-foreground mb-4">ยังไม่มีแผนซ้อม</p>
              <Link href="/plan/new" className={buttonVariants()}>
                สร้างแผนซ้อมแรก
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
