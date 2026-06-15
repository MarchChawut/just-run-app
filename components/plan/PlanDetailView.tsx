"use client"

import { useState } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import {
  WORKOUT_COLORS,
  WORKOUT_LABELS,
  TARGET_DISTANCE_LABELS,
  PHASE_COLORS,
} from "@/types"
import type { GeneratedPlan, GeneratedWeek, GeneratedDay, WorkoutType, TrainingPlan } from "@/types"

const DAYS_TH_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]

const PHASE_KEY_MAP: Record<string, keyof typeof PHASE_COLORS> = {
  "Base Training": "base",
  "Speed & Strength": "build",
  "Peak Training": "peak",
  "Peak & Taper": "taper",
}

function phaseColor(phaseName: string): string {
  const key = PHASE_KEY_MAP[phaseName]
  return key ? PHASE_COLORS[key] : "#888"
}

function RpeBar({ rpe }: { rpe: number }) {
  const rpeColors = ["#555", "#4af08c", "#4af08c", "#a0f04a", "#a0f04a", "#e8ff4a", "#ffba4a", "#ff8c4a", "#ff5a4a", "#ff4a4a", "#ff4a4a"]
  const color = rpeColors[Math.min(10, Math.max(0, rpe))] ?? "#555"
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(rpe / 10) * 100}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{rpe}</span>
    </div>
  )
}

function WorkoutDot({ type }: { type: WorkoutType }) {
  return (
    <div
      className="w-2 h-2 rounded-full"
      style={{ background: WORKOUT_COLORS[type] ?? "#555" }}
      title={WORKOUT_LABELS[type]}
    />
  )
}

function DayDetailPanel({ day, onClose }: { day: GeneratedDay; onClose: () => void }) {
  const color = WORKOUT_COLORS[day.type] ?? "#888"
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl p-5 space-y-4 max-w-lg mx-auto"
      style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "70vh", overflowY: "auto" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
            style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
          >
            {WORKOUT_LABELS[day.type]}
          </span>
          {day.distance > 0 && (
            <div className="mt-2 flex items-center gap-3 font-mono text-sm" style={{ color: "#e8ff4a" }}>
              <span>{day.distance.toFixed(1)} km</span>
              {day.pace !== "N/A" && <span>· {day.pace} /km</span>}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-sm px-2 py-1 rounded"
          style={{ color: "#666", background: "rgba(255,255,255,0.05)" }}
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "#666" }}>RPE</span>
        <RpeBar rpe={day.rpe} />
      </div>

      <p className="text-sm" style={{ color: "#ccc", lineHeight: 1.6 }}>{day.description}</p>

      {day.notes && (
        <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(232,255,74,0.05)", border: "1px solid rgba(232,255,74,0.12)", color: "#aaa" }}>
          {day.notes}
        </div>
      )}
    </div>
  )
}

function WeekCard({
  week,
  isExpanded,
  onToggle,
  onDayClick,
}: {
  week: GeneratedWeek
  isExpanded: boolean
  onToggle: () => void
  onDayClick: (day: GeneratedDay) => void
}) {
  const color = phaseColor(week.phase)

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ background: "#111118", border: `1px solid rgba(255,255,255,0.07)` }}
    >
      {/* Card header */}
      <button
        className="w-full text-left p-3 space-y-2"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: "#ccc" }}>สัปดาห์ {week.weekNumber}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
            >
              {week.phase}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(week.elevationGain ?? 0) > 0 && (
              <span className="text-xs font-mono" style={{ color: "#ff9f4a" }}>+{week.elevationGain}m</span>
            )}
            <span className="text-xs font-mono" style={{ color: "#e8ff4a" }}>{week.totalKm} km</span>
          </div>
        </div>

        {/* 7 workout dots */}
        <div className="flex gap-1.5 items-center">
          {week.days.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <WorkoutDot type={day.type} />
              <span className="text-[9px]" style={{ color: "#444" }}>{DAYS_TH_SHORT[i]}</span>
            </div>
          ))}
        </div>
      </button>

      {/* Expanded day list */}
      {isExpanded && (
        <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {week.days.map((day, i) => {
            const col = WORKOUT_COLORS[day.type] ?? "#555"
            return (
              <button
                key={i}
                className="w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors hover:bg-white/5"
                onClick={() => onDayClick(day)}
                style={{ borderBottom: i < 6 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              >
                <span className="text-xs w-5 shrink-0" style={{ color: "#555" }}>{DAYS_TH_SHORT[i]}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{ background: `${col}18`, color: col, border: `1px solid ${col}30` }}
                >
                  {WORKOUT_LABELS[day.type]}
                </span>
                {day.distance > 0 && (
                  <span className="text-xs font-mono shrink-0" style={{ color: "#e8ff4a" }}>{day.distance.toFixed(1)} km</span>
                )}
                {(day.elevationGain ?? 0) > 0 && (
                  <span className="text-xs font-mono shrink-0" style={{ color: "#ff9f4a" }}>+{day.elevationGain}m</span>
                )}
                {day.pace !== "N/A" && day.pace && (
                  <span className="text-xs font-mono shrink-0" style={{ color: "#666" }}>{day.pace}/km</span>
                )}
                <RpeBar rpe={day.rpe} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MonthlyKmChart({ weeks, startDate }: { weeks: GeneratedWeek[]; startDate: Date }) {
  type MonthBucket = { label: string; km: number; color: string }
  const buckets: MonthBucket[] = []

  for (const week of weeks) {
    const weekDate = new Date(startDate.getTime() + (week.weekNumber - 1) * 7 * 86400 * 1000)
    const label = weekDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" })
    const existing = buckets.find((b) => b.label === label)
    if (existing) {
      existing.km += week.totalKm
    } else {
      buckets.push({ label, km: week.totalKm, color: phaseColor(week.phase) })
    }
  }

  const maxKm = Math.max(...buckets.map((b) => b.km), 1)

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: "#888" }}>📅 สรุป km รายเดือน</span>
        <span className="text-xs font-mono" style={{ color: "#e8ff4a" }}>
          รวม {weeks.reduce((s, w) => s + w.totalKm, 0)} km
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {buckets.map((b, i) => (
          <div key={i} className="flex flex-col items-center gap-1 shrink-0 min-w-[64px]">
            <div className="w-full flex items-end h-10">
              <div
                className="w-full rounded-t"
                style={{ height: `${Math.max(8, (b.km / maxKm) * 40)}px`, background: `${b.color}50` }}
              />
            </div>
            <span className="text-xs font-mono text-center" style={{ color: b.color }}>{b.km}</span>
            <span className="text-[9px] text-center leading-tight" style={{ color: "#555", maxWidth: 64 }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PlanDetailView({ plan, planData }: { plan: TrainingPlan; planData: GeneratedPlan }) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null)
  const [selectedDay, setSelectedDay] = useState<GeneratedDay | null>(null)

  const totalKm = planData.weeks?.reduce((s, w) => s + w.totalKm, 0) ?? 0
  const distLabel = TARGET_DISTANCE_LABELS[plan.targetDistance as keyof typeof TARGET_DISTANCE_LABELS] ?? plan.targetDistance

  if (!planData.weeks?.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{plan.name}</h1>
          <p className="text-muted-foreground">{distLabel}</p>
        </div>
        <div className="rounded-xl p-8 text-center" style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-lg font-medium text-white mb-2">แผนนี้สร้างด้วยระบบเก่า</p>
          <p className="text-sm mb-6" style={{ color: "#666" }}>กรุณาสร้างแผนใหม่เพื่อดูแผนการซ้อมแบบละเอียด</p>
          <Link href="/plan/new" className={buttonVariants()}>+ สร้างแผนใหม่</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-20">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-xl font-bold text-white">{plan.name}</h1>
        <div className="flex items-center gap-2 mt-1 text-xs font-mono flex-wrap" style={{ color: "#888" }}>
          <span>{distLabel}</span>
          <span>·</span>
          <span>{plan.trainingWeeks} สัปดาห์</span>
          <span>·</span>
          <span>{totalKm} km รวม</span>
        </div>
      </div>

      {/* ─── Stat chips ─── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "เวลาคาดการณ์", value: planData.projectedFinishTime || "—" },
          { label: "ช่วง", value: planData.improvementRange || "—" },
          { label: "สัปดาห์", value: `${plan.trainingWeeks}` },
        ].map(({ label, value }) => (
          <div key={label} className="text-center py-2 rounded-lg" style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-sm font-mono font-bold" style={{ color: "#e8ff4a" }}>{value}</div>
            <div className="text-xs" style={{ color: "#666" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ─── Phase legend ─── */}
      <div className="flex flex-wrap gap-2">
        {(["base", "build", "peak", "taper"] as const).map((p) => (
          <div key={p} className="flex items-center gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ background: PHASE_COLORS[p] }} />
            <span style={{ color: "#666" }}>{{ base: "Base", build: "Build", peak: "Peak", taper: "Taper" }[p]}</span>
          </div>
        ))}
      </div>

      {/* ─── Monthly km chart ─── */}
      <MonthlyKmChart weeks={planData.weeks} startDate={new Date(plan.startDate)} />

      {/* ─── Weekly cards ─── */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold" style={{ color: "#888" }}>แผนรายสัปดาห์</h2>
        {planData.weeks.map((week) => (
          <WeekCard
            key={week.weekNumber}
            week={week}
            isExpanded={expandedWeek === week.weekNumber}
            onToggle={() => setExpandedWeek(expandedWeek === week.weekNumber ? null : week.weekNumber)}
            onDayClick={(day) => setSelectedDay(day)}
          />
        ))}
      </div>

      {/* ─── Day detail panel ─── */}
      {selectedDay && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setSelectedDay(null)} />
          <DayDetailPanel day={selectedDay} onClose={() => setSelectedDay(null)} />
        </>
      )}
    </div>
  )
}
