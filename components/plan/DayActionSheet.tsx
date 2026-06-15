"use client"

import { useState, useTransition, useMemo } from "react"
import { saveCompletion } from "@/app/actions/workout"
import { WORKOUT_COLORS, WORKOUT_LABELS } from "@/types"
import { generateWorkoutSteps, speedLabel, type WorkoutSection } from "@/lib/workoutSteps"
import { getMealsForWorkout, MEAL_LABELS, type MealSlot } from "@/lib/mealData"
import { calculatePaces, isTrailDistance } from "@/lib/trainingEngine"
import type { GeneratedDay, CompletionRecord, PlanGenerationInput } from "@/types"

type Props = {
  planId: string
  weekNumber: number
  dayIndex: number
  date: Date
  day: GeneratedDay
  existing?: CompletionRecord
  runMode?: "outdoor" | "treadmill"
  planInput?: Partial<PlanGenerationInput>
  onClose: () => void
  onSaved: (key: string, record: CompletionRecord) => void
}

const DAYS_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]

function paceToSpeed(pace: string): string {
  const parts = pace.split(":").map(Number)
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return ""
  const sec = parts[0] * 60 + parts[1]
  if (sec <= 0) return ""
  const speed = Math.round(3600 / sec * 10) / 10
  if (speed > 30 || speed < 3) return "" // guard: 3–30 km/h is realistic for any runner
  return `${speed.toFixed(1)} km/h`
}

function RpeBar({ rpe }: { rpe: number }) {
  const colors = ["#555", "#4af08c", "#4af08c", "#a0f04a", "#a0f04a", "#e8ff4a", "#ffba4a", "#ff8c4a", "#ff5a4a", "#ff4a4a", "#ff4a4a"]
  const color = colors[Math.min(10, Math.max(0, rpe))]
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-6" style={{ color: "#666" }}>RPE</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${(rpe / 10) * 100}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-4" style={{ color }}>{rpe}</span>
    </div>
  )
}

function StepRow({ step, isTreadmill }: { step: NonNullable<WorkoutSection["steps"][0]>; isTreadmill: boolean }) {
  const actColor = step.activity === "RUN" ? "#e8ff4a" : step.activity === "WALK" ? "#4af0ff" : "#555"
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span
        className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5"
        style={{ background: `${actColor}18`, color: actColor, border: `1px solid ${actColor}30` }}
      >
        {step.activity}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white leading-tight">{step.description}</p>
        <div className="flex flex-wrap gap-2 mt-0.5">
          {step.distance && (
            <span className="text-xs font-mono" style={{ color: "#e8ff4a" }}>{step.distance}</span>
          )}
          {step.duration && (
            <span className="text-xs font-mono" style={{ color: "#888" }}>{step.duration}</span>
          )}
          {step.pace && step.pace !== "N/A" && (
            <span className="text-xs font-mono" style={{ color: "#ccc" }}>
              {isTreadmill ? speedLabel(step.pace, true) : `${step.pace}/km`}
            </span>
          )}
        </div>
        {step.paceNote && (
          <p className="text-xs mt-0.5" style={{ color: "#666" }}>{step.paceNote}</p>
        )}
      </div>
    </div>
  )
}

function SectionBlock({ section, isTreadmill }: { section: WorkoutSection; isTreadmill: boolean }) {
  const [open, setOpen] = useState(true)
  const sectionColor = section.color ?? "#888"
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${sectionColor}30` }}>
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        style={{ background: `${sectionColor}15` }}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          {section.repeatCount && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: sectionColor, color: "#0a0a0f" }}
            >
              ×{section.repeatCount}
            </span>
          )}
          <span className="text-sm font-semibold" style={{ color: sectionColor }}>{section.label}</span>
        </div>
        <span className="text-xs" style={{ color: sectionColor }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-3" style={{ background: "rgba(0,0,0,0.3)" }}>
          {section.steps.map((step) => (
            <StepRow key={step.id} step={step} isTreadmill={isTreadmill} />
          ))}
          {section.coachNote && (
            <div className="py-2.5 text-xs" style={{ color: "#888", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              💬 {section.coachNote}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function DayActionSheet({ planId, weekNumber, dayIndex, date, day, existing, runMode = "outdoor", planInput, onClose, onSaved }: Props) {
  const [activeMode, setActiveMode] = useState<"outdoor" | "treadmill">(runMode)
  const [completionMode, setCompletionMode] = useState<"preset" | "custom">("preset")
  const [customValue, setCustomValue] = useState(existing?.completion?.toString() ?? "")
  const [note, setNote] = useState(existing?.note ?? "")
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState("")

  // Meal state: random index per slot
  const meals = useMemo(() => getMealsForWorkout(day.type), [day.type])
  const [mealIdx, setMealIdx] = useState<Record<MealSlot, number>>({
    breakfast: 0, lunch: 0, snack: 0, dinner: 0,
  })
  const refreshMeal = (slot: MealSlot) => {
    const pool = meals[slot]
    setMealIdx(prev => {
      let next
      do { next = Math.floor(Math.random() * pool.length) } while (next === prev[slot] && pool.length > 1)
      return { ...prev, [slot]: next }
    })
  }

  // Workout steps
  const paces = useMemo(() => {
    if (!planInput) return {} as Record<string, string>
    try { return calculatePaces(planInput as PlanGenerationInput) } catch { return {} as Record<string, string> }
  }, [planInput])
  const isTrail = !!planInput?.targetDistance && isTrailDistance(planInput.targetDistance)
  const sections = useMemo(
    () => generateWorkoutSteps(day.type, day.distance || 5, paces as Parameters<typeof generateWorkoutSteps>[2], isTrail),
    [day.type, day.distance, paces, isTrail]
  )

  const color = WORKOUT_COLORS[day.type] ?? "#888"
  const dayLabel = `วัน${DAYS_FULL[date.getDay()]} ${date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`
  const completionKey = `${weekNumber}-${dayIndex}`
  const current = existing?.completion
  const isTreadmill = activeMode === "treadmill"

  const save = (pct: number) => {
    const n = note.trim() || undefined
    setSaveError("")
    startTransition(async () => {
      const result = await saveCompletion({ planId, weekNumber, dayIndex, completion: pct, note: n })
      if ("success" in result) {
        onSaved(completionKey, { completion: pct, note: n ?? null })
        onClose()
      } else {
        setSaveError(result.error ?? "บันทึกไม่สำเร็จ — กรุณาลองใหม่")
      }
    })
  }

  const handleCustomSave = () => {
    const v = parseInt(customValue, 10)
    if (isNaN(v) || v < 0 || v > 100) return
    save(v)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />

      <div
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl max-w-lg mx-auto"
        style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "92vh", overflowY: "auto" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        </div>

        <div className="px-4 pb-8 space-y-4">
          {/* Date + close */}
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "#666" }}>{dayLabel}</p>
            <button onClick={onClose} className="text-xs px-2 py-1 rounded" style={{ color: "#555", background: "rgba(255,255,255,0.05)" }}>✕</button>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            {(["outdoor", "treadmill"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setActiveMode(m)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: activeMode === m ? (m === "treadmill" ? "rgba(232,255,74,0.15)" : "rgba(74,240,255,0.12)") : "transparent",
                  color: activeMode === m ? (m === "treadmill" ? "#e8ff4a" : "#4af0ff") : "#555",
                  border: activeMode === m ? `1px solid ${m === "treadmill" ? "rgba(232,255,74,0.3)" : "rgba(74,240,255,0.25)"}` : "1px solid transparent",
                }}
              >
                {m === "outdoor" ? "🌳 Outdoor" : "🏃 Treadmill"}
              </button>
            ))}
          </div>

          {/* Workout badge + distance */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
              {WORKOUT_LABELS[day.type]}
            </span>
            {day.distance > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm" style={{ color: "#e8ff4a" }}>
                  {day.distance.toFixed(1)} km{day.pace !== "N/A" && ` · ${day.pace}/km`}
                </span>
                {(day.elevationGain ?? 0) > 0 && (
                  <span className="font-mono text-sm" style={{ color: "#ff9f4a" }}>+{day.elevationGain}m D+</span>
                )}
                {isTreadmill && day.pace !== "N/A" && (
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold"
                    style={{ background: "rgba(232,255,74,0.12)", color: "#e8ff4a", border: "1px solid rgba(232,255,74,0.3)" }}>
                    {paceToSpeed(day.pace)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* RPE */}
          {day.rpe > 0 && <RpeBar rpe={day.rpe} />}

          {/* Treadmill speed callout */}
          {isTreadmill && day.pace !== "N/A" && (
            <div className="rounded-lg px-3 py-2 text-sm flex items-center gap-2"
              style={{ background: "rgba(232,255,74,0.06)", border: "1px solid rgba(232,255,74,0.18)" }}>
              <span style={{ color: "#888" }}>ตั้งลู่วิ่งที่</span>
              <span className="font-mono font-bold text-base" style={{ color: "#e8ff4a" }}>{paceToSpeed(day.pace)}</span>
            </div>
          )}

          {/* ─── Workout Steps ─── */}
          {sections.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#666" }}>ขั้นตอนการซ้อม</p>
              {sections.map((section) => (
                <SectionBlock key={section.key} section={section} isTreadmill={isTreadmill} />
              ))}
            </div>
          )}

          {/* Notes */}
          {day.notes && (
            <div className="rounded-lg px-3 py-2 text-sm"
              style={{ background: "rgba(232,255,74,0.05)", border: "1px solid rgba(232,255,74,0.12)", color: "#999" }}>
              {day.notes}
            </div>
          )}

          {/* ─── Meals ─── */}
          {day.type !== "rest" && (
            <div className="space-y-2 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#666" }}>🍽️ อาหารแนะนำวันนี้</p>
              <div className="space-y-2">
                {(Object.keys(MEAL_LABELS) as MealSlot[]).map((slot) => {
                  const meal = meals[slot][mealIdx[slot]]
                  const { label, icon } = MEAL_LABELS[slot]
                  return (
                    <div key={slot} className="rounded-lg px-3 py-2.5 flex items-start gap-2"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <span className="text-base shrink-0 mt-0.5">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold mb-0.5" style={{ color: "#888" }}>{label}</p>
                        <p className="text-sm text-white leading-tight">{meal.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#666" }}>{meal.note}</p>
                      </div>
                      <button
                        onClick={() => refreshMeal(slot)}
                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                        style={{ color: "#555" }}
                        title="เปลี่ยนเมนู"
                      >
                        🔄
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ─── Completion ─── */}
          <div className="border-t pt-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#666" }}>
              บันทึกการวิ่ง{current !== undefined && <span className="ml-1" style={{ color: "#e8ff4a" }}>({current}% ล่าสุด)</span>}
            </p>
            <div className="flex gap-2">
              <button onClick={() => save(100)} disabled={isPending}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: current === 100 ? "rgba(74,240,140,0.2)" : "rgba(74,240,140,0.08)",
                  border: `1px solid ${current === 100 ? "#4af08c" : "rgba(74,240,140,0.25)"}`,
                  color: "#4af08c",
                }}>
                ✓ เสร็จ 100%
              </button>
              <button onClick={() => save(50)} disabled={isPending}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: current === 50 ? "rgba(232,255,74,0.2)" : "rgba(232,255,74,0.06)",
                  border: `1px solid ${current === 50 ? "#e8ff4a" : "rgba(232,255,74,0.2)"}`,
                  color: "#e8ff4a",
                }}>
                ✓ 50%
              </button>
              <button onClick={() => setCompletionMode(completionMode === "custom" ? "preset" : "custom")}
                className="px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: completionMode === "custom" ? "rgba(255,159,74,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${completionMode === "custom" ? "#ff9f4a" : "rgba(255,255,255,0.1)"}`,
                  color: completionMode === "custom" ? "#ff9f4a" : "#888",
                }}>
                กำหนดเอง
              </button>
            </div>

            {completionMode === "custom" && (
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={100} value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="0–100"
                  className="w-24 h-10 rounded-lg text-center font-mono text-sm"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
                <span className="text-sm" style={{ color: "#888" }}>%</span>
                <button onClick={handleCustomSave} disabled={isPending || !customValue}
                  className="flex-1 h-10 rounded-lg text-sm font-semibold"
                  style={{ background: customValue ? "#e8ff4a" : "rgba(255,255,255,0.08)", color: customValue ? "#0a0a0f" : "#444" }}>
                  {isPending ? "บันทึก..." : "บันทึก"}
                </button>
              </div>
            )}

            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="หมายเหตุ (ไม่บังคับ)"
              className="w-full h-10 rounded-lg px-3 text-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#ccc" }}
            />
            {saveError && (
              <p className="text-xs text-center py-1.5 rounded-lg" style={{ color: "#ff4a4a", background: "rgba(255,74,74,0.08)", border: "1px solid rgba(255,74,74,0.2)" }}>
                {saveError}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
