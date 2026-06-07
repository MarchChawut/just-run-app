import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { TARGET_DISTANCE_LABELS } from "@/types"
import { PlanCardActions } from "@/components/plan/PlanCardActions"
import type { TrainingPlan } from "@prisma/client"

type PlanCardProps = {
  plan: TrainingPlan
}

export function PlanCard({ plan }: PlanCardProps) {
  const raceDate = new Date(plan.raceDate)
  const weeksLeft = Math.max(
    0,
    Math.ceil((raceDate.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000))
  )

  const distLabel =
    TARGET_DISTANCE_LABELS[plan.targetDistance as keyof typeof TARGET_DISTANCE_LABELS] ??
    plan.targetDistance

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex-1 min-w-0 truncate">{plan.name}</CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {plan.isActive && <Badge variant="default">Active</Badge>}
            <PlanCardActions
              planId={plan.id}
              planName={plan.name}
              isActive={plan.isActive}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">เป้าหมาย</p>
            <p className="font-medium">{distLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">จำนวนสัปดาห์</p>
            <p className="font-medium">{plan.trainingWeeks} สัปดาห์</p>
          </div>
          <div>
            <p className="text-muted-foreground">วันแข่ง</p>
            <p className="font-medium">{raceDate.toLocaleDateString("th-TH")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">เหลือ</p>
            <p className="font-medium">{weeksLeft} สัปดาห์</p>
          </div>
          {plan.projectedTime && (
            <div className="col-span-2">
              <p className="text-muted-foreground">เวลาคาดการณ์</p>
              <p className="font-medium font-mono" style={{ color: "#e8ff4a" }}>{plan.projectedTime}</p>
            </div>
          )}
        </div>

        <Link
          href={`/plan/${plan.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
        >
          ดูรายละเอียด
        </Link>
      </CardContent>
    </Card>
  )
}
