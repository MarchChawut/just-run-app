"use client"
import { Badge } from "@/components/ui/badge"
import { WORKOUT_LABELS, WORKOUT_COLORS } from "@/types"
import type { GeneratedDay } from "@/types"

type TrainingCalendarProps = {
  trainingDays: GeneratedDay[]
}

export function TrainingCalendar({ trainingDays }: TrainingCalendarProps) {
  return (
    <div className="space-y-2">
      {trainingDays.map((day, i) => {
        const color = WORKOUT_COLORS[day.type] ?? "#555"
        return (
          <div key={i} className="flex items-center gap-3 text-sm">
            <Badge
              className="shrink-0 text-xs"
              style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
            >
              {WORKOUT_LABELS[day.type]}
            </Badge>
            {day.distance > 0 && <span className="font-mono text-xs">{day.distance.toFixed(1)} km</span>}
            {day.pace !== "N/A" && <span className="text-muted-foreground text-xs">{day.pace}/km</span>}
          </div>
        )
      })}
    </div>
  )
}
