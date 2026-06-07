"use client"

import { useState } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { WORKOUT_COLORS, TARGET_DISTANCE_LABELS, PHASE_COLORS } from "@/types"
import { DayActionSheet } from "@/components/plan/DayActionSheet"
import type { GeneratedPlan, GeneratedDay, GeneratedWeek, TrainingPlan, CompletionMap, CompletionRecord } from "@/types"

const DAYS_HEADER = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]

const PHASE_KEY_MAP: Record<string, keyof typeof PHASE_COLORS> = {
  "Base Training": "base",
  "Speed & Strength": "build",
  "Peak Training": "peak",
  "Peak & Taper": "taper",
}

// Find the Sunday of the week containing startDate
function weekStartSunday(startDate: Date): Date {
  const d = new Date(startDate)
  d.setDate(d.getDate() - d.getDay()) // d.getDay(): 0=Sun,1=Mon,...,6=Sat
  return d
}

// Compute actual Date for a day slot (dayIndex 0=Sun … 6=Sat)
function dayDate(startDate: Date, weekNumber: number, dayIndex: number): Date {
  const sunday = weekStartSunday(startDate)
  sunday.setDate(sunday.getDate() + (weekNumber - 1) * 7 + dayIndex)
  return sunday
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

type PlanDay = {
  date: Date
  weekNumber: number
  dayIndex: number
  day: GeneratedDay
  phaseName: string
}

// Build flat list of all plan days with actual dates
function buildPlanDays(planData: GeneratedPlan, startDate: Date): PlanDay[] {
  const result: PlanDay[] = []
  for (const week of planData.weeks) {
    for (let di = 0; di < week.days.length; di++) {
      result.push({
        date: dayDate(startDate, week.weekNumber, di),
        weekNumber: week.weekNumber,
        dayIndex: di,
        day: week.days[di],
        phaseName: week.phase,
      })
    }
  }
  return result
}

function completionColor(pct: number): string {
  if (pct >= 100) return "#4af08c"
  if (pct >= 50) return "#e8ff4a"
  if (pct > 0) return "#ff9f4a"
  return "transparent"
}

type DayCell = {
  date: Date
  planDay?: PlanDay
  isCurrentMonth: boolean
}

function buildCalendarGrid(year: number, month: number, planDays: PlanDay[]): DayCell[][] {
  // First day of month
  const first = new Date(year, month, 1)
  // Offset to align with Sun=0
  const startOffset = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const planDayMap = new Map<string, PlanDay>()
  for (const pd of planDays) {
    planDayMap.set(`${pd.date.getFullYear()}-${pd.date.getMonth()}-${pd.date.getDate()}`, pd)
  }

  const cells: DayCell[] = []

  // Fill leading empty cells from previous month
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, 1 - startOffset + i)
    cells.push({ date: d, isCurrentMonth: false })
  }

  // Fill current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    const key = `${year}-${month}-${day}`
    cells.push({ date: d, planDay: planDayMap.get(key), isCurrentMonth: true })
  }

  // Fill trailing cells to complete last row
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month + 1, cells.length - startOffset - daysInMonth + 1)
    cells.push({ date: d, isCurrentMonth: false })
  }

  // Split into weeks
  const rows: DayCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
  }
  return rows
}

const MONTH_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

export function PlanCalendarView({
  plan,
  planData,
  completionMap: initialCompletionMap,
  runMode = "outdoor",
}: {
  plan: TrainingPlan
  planData: GeneratedPlan
  completionMap: CompletionMap
  runMode?: "outdoor" | "treadmill"
}) {
  const today = new Date()
  const startDate = new Date(plan.startDate)

  // Default to current month, or plan start month if plan hasn't started
  const defaultMonth = startDate > today ? startDate : today
  const [viewYear, setViewYear] = useState(defaultMonth.getFullYear())
  const [viewMonth, setViewMonth] = useState(defaultMonth.getMonth())
  const [completionMap, setCompletionMap] = useState<CompletionMap>(initialCompletionMap)
  const [selectedPlanDay, setSelectedPlanDay] = useState<PlanDay | null>(null)

  if (!planData.weeks?.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">{plan.name}</h1>
        <div className="rounded-xl p-8 text-center" style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="font-medium text-white mb-2">แผนนี้สร้างด้วยระบบเก่า</p>
          <p className="text-sm mb-6" style={{ color: "#666" }}>กรุณาสร้างแผนใหม่เพื่อดูปฏิทินซ้อม</p>
          <Link href="/plan/new" className={buttonVariants()}>+ สร้างแผนใหม่</Link>
        </div>
      </div>
    )
  }

  const planDays = buildPlanDays(planData, startDate)
  const calendarRows = buildCalendarGrid(viewYear, viewMonth, planDays)
  const totalKm = planData.weeks.reduce((s, w) => s + w.totalKm, 0)
  const distLabel = TARGET_DISTANCE_LABELS[plan.targetDistance as keyof typeof TARGET_DISTANCE_LABELS] ?? plan.targetDistance

  const completedCount = Object.values(completionMap).filter((r) => r.completion >= 100).length
  const totalActiveDays = planDays.filter((pd) => pd.day.type !== "rest").length

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const handleSaved = (key: string, record: CompletionRecord) => {
    setCompletionMap(prev => ({ ...prev, [key]: record }))
  }

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-lg font-bold text-white">{plan.name}</h1>
        <div className="flex flex-wrap gap-2 mt-1 text-xs font-mono" style={{ color: "#888" }}>
          <span>{distLabel}</span>
          <span>·</span>
          <span>{plan.trainingWeeks} สัปดาห์</span>
          <span>·</span>
          <span>{totalKm} km รวม</span>
          {planData.projectedFinishTime && (
            <>
              <span>·</span>
              <span style={{ color: "#e8ff4a" }}>คาด {planData.projectedFinishTime}</span>
            </>
          )}
        </div>
      </div>

      {/* ─── Progress summary ─── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "เสร็จแล้ว", value: completedCount, unit: "วัน" },
          { label: "ทั้งหมด", value: totalActiveDays, unit: "วัน" },
          { label: "Progress", value: totalActiveDays > 0 ? Math.round((completedCount / totalActiveDays) * 100) : 0, unit: "%" },
        ].map(({ label, value, unit }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-lg font-bold font-mono" style={{ color: "#e8ff4a" }}>{value}<span className="text-xs ml-0.5">{unit}</span></div>
            <div className="text-[10px] mt-0.5" style={{ color: "#666" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ─── Phase legend ─── */}
      <div className="flex flex-wrap gap-3">
        {(["base", "build", "peak", "taper"] as const).map((p) => (
          <div key={p} className="flex items-center gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ background: PHASE_COLORS[p] }} />
            <span style={{ color: "#666" }}>{{ base: "Base", build: "Build", peak: "Peak", taper: "Taper" }[p]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: "#4af08c" }} />
          <span style={{ color: "#666" }}>เสร็จแล้ว</span>
        </div>
      </div>

      {/* ─── Calendar ─── */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={prevMonth}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: "#888" }}
          >
            ←
          </button>
          <span className="text-sm font-semibold text-white">
            {MONTH_TH[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: "#888" }}
          >
            →
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 px-2">
          {DAYS_HEADER.map((d) => (
            <div key={d} className="text-center py-1.5 text-[10px] font-semibold" style={{ color: "#555" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="px-2 pb-3 space-y-1">
          {calendarRows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7 gap-1">
              {row.map((cell, ci) => {
                const pd = cell.planDay
                const isToday = isSameDay(cell.date, today)
                const compKey = pd ? `${pd.weekNumber}-${pd.dayIndex}` : ""
                const comp = pd ? completionMap[compKey] : undefined
                const compPct = comp?.completion ?? 0
                const phaseKey = pd ? PHASE_KEY_MAP[pd.phaseName] : undefined
                const workoutColor = pd ? (WORKOUT_COLORS[pd.day.type] ?? "#555") : "#333"
                const isRest = pd?.day.type === "rest"
                const isActive = !!pd && !isRest

                return (
                  <button
                    key={ci}
                    onClick={() => pd && setSelectedPlanDay(pd)}
                    disabled={!pd}
                    className="relative flex flex-col items-center rounded-lg transition-all"
                    style={{
                      minHeight: 56,
                      background: isActive
                        ? compPct >= 100
                          ? "rgba(74,240,140,0.12)"
                          : `${workoutColor}0d`
                        : isRest
                          ? "rgba(255,255,255,0.02)"
                          : "transparent",
                      border: isToday
                        ? "1.5px solid #e8ff4a"
                        : isActive
                          ? `1px solid ${workoutColor}30`
                          : "1px solid transparent",
                      opacity: cell.isCurrentMonth ? 1 : 0.2,
                      cursor: pd ? "pointer" : "default",
                    }}
                  >
                    {/* Date number */}
                    <span
                      className="text-[11px] font-medium mt-1.5"
                      style={{ color: isToday ? "#e8ff4a" : cell.isCurrentMonth ? "#ccc" : "#555" }}
                    >
                      {cell.date.getDate()}
                    </span>

                    {/* Workout dot */}
                    {isActive && (
                      <div
                        className="w-1.5 h-1.5 rounded-full my-0.5"
                        style={{ background: workoutColor }}
                      />
                    )}

                    {/* Completion indicator */}
                    {isActive && compPct > 0 && (
                      <div className="absolute bottom-0 inset-x-1 h-1 rounded-b-lg overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${compPct}%`,
                            background: completionColor(compPct),
                          }}
                        />
                      </div>
                    )}

                    {/* 100% checkmark */}
                    {isActive && compPct >= 100 && (
                      <span className="text-[9px] font-bold" style={{ color: "#4af08c" }}>✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Day Action Sheet ─── */}
      {selectedPlanDay && (
        <DayActionSheet
          planId={plan.id}
          weekNumber={selectedPlanDay.weekNumber}
          dayIndex={selectedPlanDay.dayIndex}
          date={selectedPlanDay.date}
          day={selectedPlanDay.day}
          existing={completionMap[`${selectedPlanDay.weekNumber}-${selectedPlanDay.dayIndex}`]}
          runMode={runMode}
          onClose={() => setSelectedPlanDay(null)}
          onSaved={(key, record) => {
            handleSaved(key, record)
            setSelectedPlanDay(null)
          }}
        />
      )}
    </div>
  )
}
