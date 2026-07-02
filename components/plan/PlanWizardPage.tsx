"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createPlanFromWizard } from "@/app/actions/plan"
import { DISTANCE_CONFIGS, getDefaultTrainingDays, isTrailDistance, normalizeDistance } from "@/lib/trainingEngine"
import { findTemplate } from "@/lib/planTemplates"
import { TARGET_DISTANCE_LABELS, EXPERIENCE_LEVEL_LABELS, TRAINING_GOAL_LABELS } from "@/types"
import type { TargetDistance, WizardFormState, RunnerProfile, ExperienceLevel } from "@/types"

const DAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
const STEP_LABELS = ["ระยะ", "วันที่", "ตาราง", "ฟิตเนส", "โปรแกรม", "สรุป"]
const DISTANCES = Object.keys(DISTANCE_CONFIGS) as TargetDistance[]

const INTENSITY_OPTIONS = [
  { value: "gentle", label: "ผ่อนคลาย", desc: "สำหรับผู้เริ่มต้น หรือต้องการฟื้นฟู", color: "#4af0ff" },
  { value: "normal", label: "ปกติ", desc: "มาตรฐานสำหรับนักวิ่งทั่วไป", color: "#e8ff4a" },
  { value: "challenging", label: "ท้าทาย", desc: "สำหรับผู้ต้องการ PR ใหม่", color: "#ff9f4a" },
  { value: "elite", label: "Elite", desc: "โปรแกรมหนักสำหรับนักวิ่งขั้นสูง", color: "#ff4a4a" },
] as const

const LEVEL_OPTIONS = [
  { value: "beginner", label: "Beginner", desc: "มือใหม่ / เพิ่งเริ่มซ้อมจริงจัง", color: "#4af0ff" },
  { value: "intermediate", label: "Intermediate", desc: "ซ้อมสม่ำเสมอ มีพื้นฐาน", color: "#e8ff4a" },
  { value: "advanced", label: "Advanced", desc: "นักวิ่งขั้นสูง เคยแข่งหลายรายการ", color: "#ff9f4a" },
] as const

function defaultState(profile: RunnerProfile | null): WizardFormState {
  let trainingDays: number[] = []
  try {
    trainingDays = JSON.parse(profile?.trainingDays ?? "[]")
  } catch {}
  const initialDistance: TargetDistance | "" = profile?.targetDistance
    ? normalizeDistance(profile.targetDistance)
    : ""
  return {
    targetDistance: initialDistance,
    level: (profile?.level as ExperienceLevel) ?? "beginner",
    trainingGoal: "performance",
    elevationGain:
      profile?.elevationGain ??
      (initialDistance ? DISTANCE_CONFIGS[initialDistance].defaultGain : 0),
    startDate: new Date().toISOString().slice(0, 10),
    raceDate: "",
    trainingWeeks: 12,
    daysPerWeek: profile?.daysPerWeek ?? 4,
    trainingDays: trainingDays.length > 0 ? trainingDays : getDefaultTrainingDays(profile?.daysPerWeek ?? 4),
    longRunDay: profile?.longRunDay ?? 6,
    sessionTime: (profile?.sessionTime as "morning" | "evening" | "both") ?? "evening",
    morningZone2: profile?.morningZone2 ?? false,
    morningMinutes: profile?.morningMinutes ?? 45,
    eveningMinutes: profile?.eveningMinutes ?? 45,
    pr5k: profile?.pr5k ?? "",
    pr10k: profile?.pr10k ?? "",
    prHalf: profile?.prHalf ?? "",
    prFull: profile?.prFull ?? "",
    intensity: (profile?.intensity as "gentle"|"normal"|"challenging"|"elite") ?? "normal",
    terrainType: profile?.terrainType ?? "road",
    runMode: (profile?.runMode as "outdoor" | "treadmill") ?? "outdoor",
    name: "แผนซ้อมวิ่ง",
  }
}

export function PlanWizardPage({ profile }: { profile: RunnerProfile | null }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<WizardFormState>(() => defaultState(profile))
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const [zone2Custom, setZone2Custom] = useState(false)
  // Track whether the user has manually edited elevation gain, so switching
  // distance updates the default only while it's untouched.
  const [gainTouched, setGainTouched] = useState(false)

  const update = (patch: Partial<WizardFormState>) => setForm((prev) => ({ ...prev, ...patch }))

  // Template-backed formula (exact static plan) for the current distance × level.
  // When present it FIXES the plan length / days-per-week and ignores PR + intensity;
  // the server action is the source of truth: it honors the chosen start date and
  // fits the plan length to the window (16 → template.weeks). Here we only reflect
  // that in the UI so the summary isn't misleading.
  const template = form.targetDistance
    ? findTemplate(form.targetDistance as TargetDistance, form.level, form.trainingGoal)
    : undefined
  const templateActive = !!template
  // Show the training-goal toggle when this distance × level has an endurance
  // variant to switch to (i.e. more than just the default performance plan).
  const hasGoalChoice = !!form.targetDistance &&
    !!findTemplate(form.targetDistance as TargetDistance, form.level, "endurance")
  const TEMPLATE_MIN_WEEKS = 16
  // Available window (weeks) between chosen start and race dates.
  const availableWeeks =
    form.startDate && form.raceDate
      ? Math.floor((new Date(form.raceDate).getTime() - new Date(form.startDate).getTime()) / (7 * 86400 * 1000))
      : 0
  // Template plans adapt to the window: min 16, capped at the template length.
  const templateWeeksTooShort = templateActive && availableWeeks < TEMPLATE_MIN_WEEKS
  const effectiveWeeks = template
    ? Math.min(template.weeks, Math.max(TEMPLATE_MIN_WEEKS, availableWeeks))
    : form.trainingWeeks
  const effectiveDays = template?.daysPerWeek ?? form.daysPerWeek

  // Compute training weeks from dates
  const computeWeeks = (start: string, race: string, dist: TargetDistance) => {
    if (!start || !race) return 12
    const diff = Math.round((new Date(race).getTime() - new Date(start).getTime()) / (7 * 86400 * 1000))
    const config = DISTANCE_CONFIGS[dist]
    return Math.max(config.minWeeks, Math.min(config.maxWeeks, Math.max(1, diff)))
  }

  const handleDistanceSelect = (d: TargetDistance) => {
    // Auto-fill the typical gain for the new distance unless the user set one.
    const patch: Partial<WizardFormState> = { targetDistance: d }
    if (!gainTouched) patch.elevationGain = DISTANCE_CONFIGS[d].defaultGain
    update(patch)
    setStep(1)
  }

  const handleDaysPerWeekChange = (n: number) => {
    const days = getDefaultTrainingDays(n)
    update({ daysPerWeek: n, trainingDays: days, longRunDay: days[days.length - 1] })
  }

  const toggleDay = (day: number) => {
    const current = form.trainingDays
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b)
    update({ trainingDays: next, longRunDay: next.includes(form.longRunDay) ? form.longRunDay : next[next.length - 1] ?? 6 })
  }

  const validatePR = (val: string, format: "MM:SS" | "H:MM:SS"): boolean => {
    if (!val) return true
    if (format === "MM:SS") return /^\d{1,2}:\d{2}$/.test(val)
    return /^\d{1,2}:\d{2}:\d{2}$/.test(val)
  }

  const prErrors = {
    pr5k: !validatePR(form.pr5k, "MM:SS"),
    pr10k: !validatePR(form.pr10k, "MM:SS"),
    prHalf: !validatePR(form.prHalf, "H:MM:SS"),
    prFull: !validatePR(form.prFull, "H:MM:SS"),
  }
  const hasPRError = Object.values(prErrors).some(Boolean)

  const canNext = (): boolean => {
    if (step === 0) return !!form.targetDistance
    if (step === 1) return !!form.startDate && !!form.raceDate && new Date(form.raceDate) > new Date(form.startDate)
    if (step === 2) return form.trainingDays.length === form.daysPerWeek
    if (step === 3) return !hasPRError
    return true
  }

  const handleNext = () => {
    if (step < 5 && canNext()) setStep(step + 1)
  }

  const handleSubmit = () => {
    setError("")
    if (!form.targetDistance) return
    const distLabel = TARGET_DISTANCE_LABELS[form.targetDistance]
    const planName = form.name || `แผนซ้อม ${distLabel} ${form.trainingWeeks} สัปดาห์`

    startTransition(async () => {
      const result = await createPlanFromWizard({
        name: planName,
        targetDistance: form.targetDistance as TargetDistance,
        level: form.level,
        trainingGoal: form.trainingGoal,
        startDate: form.startDate,
        raceDate: form.raceDate,
        trainingWeeks: form.trainingWeeks,
        daysPerWeek: form.daysPerWeek,
        trainingDays: form.trainingDays,
        longRunDay: form.longRunDay,
        sessionTime: form.sessionTime,
        morningZone2: form.morningZone2,
        morningMinutes: form.morningMinutes,
        eveningMinutes: form.eveningMinutes,
        intensity: form.intensity,
        terrainType: form.terrainType as "road" | "trail" | "track" | "mixed",
        runMode: form.runMode,
        elevationGain: isTrailDistance(form.targetDistance) ? form.elevationGain : undefined,
        pr5k: form.pr5k || undefined,
        pr10k: form.pr10k || undefined,
        prHalf: form.prHalf || undefined,
        prFull: form.prFull || undefined,
      })
      if ("error" in result) {
        setError(result.error ?? "เกิดข้อผิดพลาด")
      } else if ("planId" in result) {
        router.push(`/plan/${result.planId}`)
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0f" }}>
      {/* ─── Header ─── */}
      <div className="sticky top-0 z-20 border-b" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(10,10,15,0.97)", backdropFilter: "blur(10px)" }}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-heading, sans-serif)", color: "#e8ff4a" }}>
              ตัวตึง JUST RUN!
            </span>
            <span className="text-xs font-mono" style={{ color: "#666" }}>ขั้น {step + 1}/6</span>
          </div>
          {/* Progress pills */}
          <div className="flex gap-1.5">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-1.5 flex-1">
                <div className="flex flex-col items-center gap-0.5 w-full">
                  <div
                    className="h-1 w-full rounded-full transition-all duration-300"
                    style={{
                      background: i < step ? "#e8ff4a66" : i === step ? "#e8ff4a" : "rgba(255,255,255,0.1)",
                    }}
                  />
                  <span className="text-[10px] hidden sm:block" style={{ color: i === step ? "#e8ff4a" : "#444" }}>
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Content: min-h-full centers short steps, overflow scrolls long steps ─── */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center">
        <div className="max-w-2xl mx-auto w-full px-4 py-4">
          {/* Step 1: Distance */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">เลือกระยะทางเป้าหมาย</h2>
                <p className="text-sm mt-1" style={{ color: "#888" }}>คลิกเพื่อเลือก — จะไปขั้นถัดไปอัตโนมัติ</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {DISTANCES.map((d) => {
                  const cfg = DISTANCE_CONFIGS[d]
                  const isSelected = form.targetDistance === d
                  return (
                    <button
                      key={d}
                      onClick={() => handleDistanceSelect(d)}
                      className="text-left p-4 rounded-xl border transition-all duration-150"
                      style={{
                        background: isSelected ? "rgba(232,255,74,0.08)" : "rgba(255,255,255,0.03)",
                        borderColor: isSelected ? "#e8ff4a" : "rgba(255,255,255,0.08)",
                        boxShadow: isSelected ? "0 0 12px rgba(232,255,74,0.15)" : "none",
                      }}
                    >
                      <div className="text-2xl mb-1">{cfg.icon}</div>
                      <div className="font-semibold text-sm text-white">{cfg.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#666" }}>
                        {cfg.minWeeks}–{cfg.maxWeeks} สัปดาห์ · สูงสุด {cfg.peakKmPerWeek} km/สัปดาห์
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: Dates */}
          {step === 1 && form.targetDistance && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">กำหนดวันที่</h2>
                <p className="text-sm mt-1" style={{ color: "#888" }}>
                  {DISTANCE_CONFIGS[form.targetDistance].icon} {TARGET_DISTANCE_LABELS[form.targetDistance]}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>วันเริ่มซ้อม</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => {
                      const sd = e.target.value
                      const wk = computeWeeks(sd, form.raceDate, form.targetDistance as TargetDistance)
                      update({ startDate: sd, trainingWeeks: wk })
                    }}
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>วันแข่ง</Label>
                  <Input
                    type="date"
                    value={form.raceDate}
                    onChange={(e) => {
                      const rd = e.target.value
                      const wk = computeWeeks(form.startDate, rd, form.targetDistance as TargetDistance)
                      update({ raceDate: rd, trainingWeeks: wk })
                    }}
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                </div>

                {form.startDate && form.raceDate && (
                  <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(232,255,74,0.06)", border: "1px solid rgba(232,255,74,0.2)" }}>
                    <span style={{ color: "#e8ff4a" }}>
                      ระยะเวลาซ้อม {form.trainingWeeks} สัปดาห์
                    </span>
                    {(() => {
                      const cfg = DISTANCE_CONFIGS[form.targetDistance as TargetDistance]
                      const raw = Math.round((new Date(form.raceDate).getTime() - new Date(form.startDate).getTime()) / (7 * 86400 * 1000))
                      if (raw < cfg.minWeeks) return <span className="ml-2 text-xs" style={{ color: "#ff9f4a" }}>(ปรับจาก {raw} สัปดาห์ → ขั้นต่ำ {cfg.minWeeks})</span>
                      if (raw > cfg.maxWeeks) return <span className="ml-2 text-xs" style={{ color: "#ff9f4a" }}>(ปรับจาก {raw} สัปดาห์ → สูงสุด {cfg.maxWeeks})</span>
                      return null
                    })()}
                  </div>
                )}

                {/* Recommended weeks pills */}
                {form.targetDistance && (
                  <div className="space-y-1.5">
                    <Label>แนะนำ</Label>
                    <div className="flex flex-wrap gap-2">
                      {DISTANCE_CONFIGS[form.targetDistance as TargetDistance].recommendedWeeks.map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => {
                            if (!form.startDate) return
                            const raceMs = new Date(form.startDate).getTime() + w * 7 * 86400 * 1000
                            update({ trainingWeeks: w, raceDate: new Date(raceMs).toISOString().slice(0, 10) })
                          }}
                          className="px-3 py-1 rounded-full text-xs font-mono transition-colors"
                          style={{
                            background: form.trainingWeeks === w ? "rgba(232,255,74,0.15)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${form.trainingWeeks === w ? "#e8ff4a" : "rgba(255,255,255,0.1)"}`,
                            color: form.trainingWeeks === w ? "#e8ff4a" : "#888",
                          }}
                        >
                          {w} สัปดาห์
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Schedule */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">ตารางซ้อม</h2>
                <p className="text-sm mt-1" style={{ color: "#888" }}>กำหนดวันและเวลาซ้อม</p>
              </div>

              {/* Days per week */}
              <div className="space-y-2">
                <Label>จำนวนวันซ้อม/สัปดาห์</Label>
                <div className="flex gap-2">
                  {[3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleDaysPerWeekChange(n)}
                      className="w-12 h-10 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: form.daysPerWeek === n ? "rgba(232,255,74,0.15)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${form.daysPerWeek === n ? "#e8ff4a" : "rgba(255,255,255,0.1)"}`,
                        color: form.daysPerWeek === n ? "#e8ff4a" : "#888",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Training days */}
              <div className="space-y-2">
                <Label>
                  วันที่ซ้อม{" "}
                  <span className="text-xs font-mono ml-1" style={{ color: form.trainingDays.length === form.daysPerWeek ? "#e8ff4a" : "#ff4a4a" }}>
                    ({form.trainingDays.length}/{form.daysPerWeek})
                  </span>
                </Label>
                <div className="flex gap-2">
                  {DAYS_TH.map((day, i) => {
                    const isSelected = form.trainingDays.includes(i)
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className="w-9 h-9 rounded-full text-xs font-medium transition-colors"
                        style={{
                          background: isSelected ? "#e8ff4a" : "rgba(255,255,255,0.05)",
                          color: isSelected ? "#0a0a0f" : "#888",
                          border: `1px solid ${isSelected ? "#e8ff4a" : "rgba(255,255,255,0.1)"}`,
                        }}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
                {form.trainingDays.length !== form.daysPerWeek && (
                  <p className="text-xs" style={{ color: "#ff9f4a" }}>
                    กรุณาเลือกให้ครบ {form.daysPerWeek} วัน
                  </p>
                )}
              </div>

              {/* Long run day */}
              {form.trainingDays.length > 0 && (
                <div className="space-y-2">
                  <Label>วัน Long Run</Label>
                  <div className="flex gap-2 flex-wrap">
                    {form.trainingDays.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => update({ longRunDay: d })}
                        className="px-3 h-9 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          background: form.longRunDay === d ? "rgba(232,255,74,0.15)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${form.longRunDay === d ? "#e8ff4a" : "rgba(255,255,255,0.1)"}`,
                          color: form.longRunDay === d ? "#e8ff4a" : "#888",
                        }}
                      >
                        {DAYS_TH[d]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Session time */}
              <div className="space-y-2">
                <Label>เวลาซ้อม</Label>
                <div className="flex gap-2">
                  {(["morning", "evening", "both"] as const).map((t) => {
                    const labels = { morning: "เช้า 🌅", evening: "เย็น 🌆", both: "เช้า+เย็น" }
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => update({ sessionTime: t })}
                        className="px-3 h-9 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          background: form.sessionTime === t ? "rgba(232,255,74,0.15)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${form.sessionTime === t ? "#e8ff4a" : "rgba(255,255,255,0.1)"}`,
                          color: form.sessionTime === t ? "#e8ff4a" : "#888",
                        }}
                      >
                        {labels[t]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Zone 2 toggle */}
              <div className="space-y-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      💚 Zone 2{" "}
                      {form.sessionTime === "both" ? "เช้า (ก่อน session หลัก)" : form.sessionTime === "morning" ? "เช้า" : "เย็น"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#666" }}>วิ่งเบา HR ต่ำ สร้าง aerobic base</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { update({ morningZone2: !form.morningZone2 }); setZone2Custom(false) }}
                    className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                    style={{ background: form.morningZone2 ? "#4af08c" : "rgba(255,255,255,0.12)" }}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
                      style={{
                        background: form.morningZone2 ? "#0a0a0f" : "#666",
                        transform: form.morningZone2 ? "translateX(22px)" : "translateX(2px)",
                      }}
                    />
                  </button>
                </div>

                {form.morningZone2 && (
                  <div className="space-y-2">
                    <p className="text-xs" style={{ color: "#888" }}>ระยะเวลา Zone 2</p>
                    <div className="flex flex-wrap gap-2">
                      {[30, 45, 60, 75, 90].map((min) => (
                        <button
                          key={min}
                          type="button"
                          onClick={() => { update({ morningMinutes: min }); setZone2Custom(false) }}
                          className="px-3 h-8 rounded-lg text-xs font-mono font-medium transition-colors"
                          style={{
                            background: !zone2Custom && form.morningMinutes === min ? "rgba(74,240,140,0.2)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${!zone2Custom && form.morningMinutes === min ? "#4af08c" : "rgba(255,255,255,0.1)"}`,
                            color: !zone2Custom && form.morningMinutes === min ? "#4af08c" : "#888",
                          }}
                        >
                          {min} นาที
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setZone2Custom(!zone2Custom)}
                        className="px-3 h-8 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          background: zone2Custom ? "rgba(74,240,140,0.15)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${zone2Custom ? "#4af08c" : "rgba(255,255,255,0.1)"}`,
                          color: zone2Custom ? "#4af08c" : "#888",
                        }}
                      >
                        กำหนดเอง
                      </button>
                    </div>

                    {zone2Custom && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={15}
                          max={180}
                          value={form.morningMinutes}
                          onChange={(e) => update({ morningMinutes: parseInt(e.target.value) || 45 })}
                          className="w-20 h-9 rounded-lg text-center font-mono text-sm"
                          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(74,240,140,0.4)", color: "#4af08c" }}
                        />
                        <span className="text-sm" style={{ color: "#666" }}>นาที</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Run mode: Outdoor / Treadmill */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">โหมดการวิ่ง</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: "outdoor", label: "🌳 Outdoor", desc: "วิ่งกลางแจ้ง" },
                    { value: "treadmill", label: "🏃 Treadmill", desc: "ลู่วิ่ง (แสดง km/h)" },
                  ] as const).map(({ value, label, desc }) => {
                    const isSelected = form.runMode === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => update({ runMode: value })}
                        className="text-left p-3 rounded-xl border transition-all"
                        style={{
                          background: isSelected ? "rgba(232,255,74,0.08)" : "rgba(255,255,255,0.03)",
                          borderColor: isSelected ? "#e8ff4a" : "rgba(255,255,255,0.08)",
                        }}
                      >
                        <p className="font-semibold text-sm" style={{ color: isSelected ? "#e8ff4a" : "#ccc" }}>{label}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#666" }}>{desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Fitness */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">ผลงานที่ดีที่สุด (PR)</h2>
                <p className="text-sm mt-1" style={{ color: "#888" }}>ไม่บังคับ — ระบบใช้คำนวณเพซที่เหมาะสม</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {([
                  { key: "pr5k" as const, label: "5K", placeholder: "25:30", hint: "MM:SS", format: "MM:SS" as const },
                  { key: "pr10k" as const, label: "10K", placeholder: "55:00", hint: "MM:SS", format: "MM:SS" as const },
                  { key: "prHalf" as const, label: "ฮาล์ฟ 21.1K", placeholder: "2:05:00", hint: "H:MM:SS", format: "H:MM:SS" as const },
                  { key: "prFull" as const, label: "มาราธอน 42.2K", placeholder: "4:30:00", hint: "H:MM:SS", format: "H:MM:SS" as const },
                ] as const).map(({ key, label, placeholder, hint }) => {
                  const hasError = prErrors[key]
                  return (
                    <div key={key} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Input
                        value={form[key]}
                        onChange={(e) => update({ [key]: e.target.value })}
                        placeholder={placeholder}
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: `1px solid ${hasError ? "#ff4a4a" : "rgba(255,255,255,0.12)"}`,
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                      {hasError ? (
                        <p className="text-xs" style={{ color: "#ff4a4a" }}>รูปแบบไม่ถูกต้อง ใช้ {hint}</p>
                      ) : (
                        <p className="text-xs" style={{ color: "#555" }}>รูปแบบ: {hint}</p>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="rounded-lg p-3 text-xs" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#666" }}>
                💡 ถ้าไม่มี PR ระบบจะใช้ค่าเฉลี่ยตามระยะทาง {form.targetDistance ? `(${TARGET_DISTANCE_LABELS[form.targetDistance as TargetDistance]})` : ""} และความเข้มข้นที่เลือก
              </div>
            </div>
          )}

          {/* Step 5: Intensity */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">ระดับและความเข้มข้น</h2>
              </div>

              {/* Experience level */}
              <div className="space-y-2">
                <Label>ระดับความชำนาญ</Label>
                <div className="grid grid-cols-3 gap-2">
                  {LEVEL_OPTIONS.map((opt) => {
                    const isSelected = form.level === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update({ level: opt.value })}
                        className="text-left p-3 rounded-xl border transition-all"
                        style={{
                          background: isSelected ? `${opt.color}10` : "rgba(255,255,255,0.03)",
                          borderColor: isSelected ? opt.color : "rgba(255,255,255,0.08)",
                        }}
                      >
                        <div className="font-semibold text-sm" style={{ color: isSelected ? opt.color : "#ccc" }}>
                          {opt.label}
                        </div>
                        <div className="text-[11px] mt-0.5 leading-tight" style={{ color: "#666" }}>{opt.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Training goal — only when this distance × level has an endurance variant */}
              {hasGoalChoice && (
                <div className="space-y-2">
                  <Label>เป้าหมายการซ้อม</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: "performance" as const, label: "เน้นเวลา/ความเร็ว", desc: "เพซเร็ว เก็บ interval/tempo เต็มที่ · เป้าหมายทำเวลา" },
                      { value: "endurance" as const, label: "เน้นจบปลอดภัย", desc: "เพซสบาย ~8:30 · มี Cross-training ถนอมเข่า · ไม่เน้นความเร็ว" },
                    ]).map((opt) => {
                      const isSelected = form.trainingGoal === opt.value
                      const color = "#4af08c"
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => update({ trainingGoal: opt.value })}
                          className="text-left p-3 rounded-xl border transition-all"
                          style={{
                            background: isSelected ? `${color}12` : "rgba(255,255,255,0.03)",
                            borderColor: isSelected ? color : "rgba(255,255,255,0.08)",
                          }}
                        >
                          <div className="font-semibold text-sm" style={{ color: isSelected ? color : "#ccc" }}>{opt.label}</div>
                          <div className="text-[11px] mt-0.5 leading-tight" style={{ color: "#666" }}>{opt.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Template-backed formula note — this combo uses a pre-designed plan */}
              {templateActive && (
                templateWeeksTooShort ? (
                  <div className="rounded-lg p-3 text-xs" style={{ background: "rgba(255,74,74,0.08)", border: "1px solid rgba(255,74,74,0.3)", color: "#ff6666" }}>
                    ⚠️ ช่วงเวลาถึงวันแข่งสั้นเกินไป ({availableWeeks} สัปดาห์) — สูตร {TARGET_DISTANCE_LABELS[form.targetDistance as TargetDistance]}
                    ต้องมีอย่างน้อย {TEMPLATE_MIN_WEEKS} สัปดาห์ตามหลักวิทยาศาสตร์การกีฬา · กรุณาเลือกวันแข่งที่ไกลออกไป
                  </div>
                ) : (
                  <div className="rounded-lg p-3 text-xs" style={{ background: "rgba(74,240,255,0.06)", border: "1px solid rgba(74,240,255,0.25)", color: "#4af0ff" }}>
                    📋 สูตร {EXPERIENCE_LEVEL_LABELS[form.level]} · {TARGET_DISTANCE_LABELS[form.targetDistance as TargetDistance]} เป็นแผนสำเร็จรูป —
                    ปรับความยาวได้ {TEMPLATE_MIN_WEEKS}–{template.weeks} สัปดาห์ตามช่วงถึงวันแข่ง (ตอนนี้ {effectiveWeeks} สัปดาห์) · {effectiveDays} วัน/สัปดาห์ ·
                    เพซตามสูตร · ปรับได้ตามระดับความเข้มข้น · ไม่ใช้ PR · เริ่มซ้อมตามวันที่เลือก · ถ้าสัปดาห์แรกมีวันวิ่งไม่ถึง 3 วันจะเก็บเป็นสัปดาห์เกริ่นนำ ไม่นับเป็นสัปดาห์ซ้อม
                  </div>
                )
              )}

              {/* Intensity — applies to template plans too (scales paces + projected time) */}
              <div className="space-y-2">
                <Label>ระดับความเข้มข้น</Label>
                <div className="grid grid-cols-2 gap-3">
                  {INTENSITY_OPTIONS.map((opt) => {
                    const isSelected = form.intensity === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update({ intensity: opt.value })}
                        className="text-left p-3 rounded-xl border transition-all"
                        style={{
                          background: isSelected ? `${opt.color}10` : "rgba(255,255,255,0.03)",
                          borderColor: isSelected ? opt.color : "rgba(255,255,255,0.08)",
                        }}
                      >
                        <div className="font-semibold text-sm" style={{ color: isSelected ? opt.color : "#ccc" }}>
                          {opt.label}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#666" }}>{opt.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Terrain */}
              <div className="space-y-2">
                <Label>ประเภทพื้นสนาม</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "road", label: "🏙️ Road" },
                    { value: "trail", label: "🌲 Trail" },
                    { value: "track", label: "🏟️ Track" },
                    { value: "mixed", label: "🔀 Mixed" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update({ terrainType: value })}
                      className="px-3 h-9 rounded-lg text-sm transition-colors"
                      style={{
                        background: form.terrainType === value ? "rgba(232,255,74,0.12)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${form.terrainType === value ? "#e8ff4a" : "rgba(255,255,255,0.1)"}`,
                        color: form.terrainType === value ? "#e8ff4a" : "#888",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Elevation gain — trail distances only */}
              {form.targetDistance && isTrailDistance(form.targetDistance) && (
                <div className="space-y-2">
                  <Label>Elevation Gain (ระยะสะสมความสูง)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={15000}
                      step={50}
                      value={form.elevationGain}
                      onChange={(e) => {
                        setGainTouched(true)
                        update({ elevationGain: Math.max(0, Math.min(15000, Number(e.target.value) || 0)) })
                      }}
                      className="w-32"
                    />
                    <span className="text-sm" style={{ color: "#888" }}>เมตร (D+)</span>
                  </div>
                  <p className="text-xs" style={{ color: "#666" }}>
                    ค่าเริ่มต้น {DISTANCE_CONFIGS[form.targetDistance].defaultGain}m ·
                    ยิ่งชันมาก แผนจะเน้นซ้อมเนิน/power hike และเพซ/เวลาคาดการณ์จะปรับตาม
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Summary */}
          {step === 5 && form.targetDistance && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">สรุปแผนซ้อม</h2>
                <p className="text-sm mt-1" style={{ color: "#888" }}>ตรวจสอบข้อมูลก่อนสร้างแผน</p>
              </div>

              {/* Plan name */}
              <div className="space-y-1.5">
                <Label>ชื่อแผน</Label>
                <Input
                  value={form.name || `แผนซ้อม ${TARGET_DISTANCE_LABELS[form.targetDistance as TargetDistance]} ${form.trainingWeeks} สัปดาห์`}
                  onChange={(e) => update({ name: e.target.value })}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </div>

              {/* Summary grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "ระยะทาง", value: `${DISTANCE_CONFIGS[form.targetDistance as TargetDistance].icon} ${TARGET_DISTANCE_LABELS[form.targetDistance as TargetDistance]}` },
                  { label: "ระดับ", value: EXPERIENCE_LEVEL_LABELS[form.level] },
                  ...(hasGoalChoice ? [{ label: "เป้าหมาย", value: TRAINING_GOAL_LABELS[form.trainingGoal] }] : []),
                  { label: "จำนวนสัปดาห์", value: `${effectiveWeeks} สัปดาห์${templateActive ? " (ปรับตามวันแข่ง)" : ""}` },
                  { label: "วันเริ่ม", value: form.startDate ? new Date(form.startDate).toLocaleDateString("th-TH") : "—" },
                  { label: "วันแข่ง", value: form.raceDate ? new Date(form.raceDate).toLocaleDateString("th-TH") : "—" },
                  { label: "วันซ้อม/สัปดาห์", value: `${effectiveDays} วัน (${form.trainingDays.map((d) => DAYS_TH[d]).join(", ")})` },
                  { label: "Long Run", value: `วัน${DAYS_TH[form.longRunDay]}` },
                  { label: "ความเข้มข้น", value: { gentle: "ผ่อนคลาย", normal: "ปกติ", challenging: "ท้าทาย", elite: "Elite" }[form.intensity] },
                  { label: "พื้นสนาม", value: form.terrainType },
                  ...(isTrailDistance(form.targetDistance) ? [{ label: "Elevation Gain", value: `${form.elevationGain} m (D+)` }] : []),
                  ...(form.pr5k ? [{ label: "PR 5K", value: form.pr5k }] : []),
                  ...(form.prFull ? [{ label: "PR มาราธอน", value: form.prFull }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-xs mb-0.5" style={{ color: "#666" }}>{label}</p>
                    <p className="font-medium text-white text-xs leading-tight">{value}</p>
                  </div>
                ))}
              </div>

              {error && <p className="text-sm" style={{ color: "#ff4a4a" }}>{error}</p>}
            </div>
          )}
          {/* ─── Navigation — flows right after content ─── */}
          <div className="flex justify-between gap-3 pt-6">
            <Button
              variant="ghost"
              onClick={() => step > 0 ? setStep(step - 1) : router.push("/plan")}
              disabled={isPending}
              style={{ color: "#888" }}
            >
              ← ย้อนกลับ
            </Button>

            {step < 5 ? (
              <Button
                onClick={handleNext}
                disabled={!canNext()}
                style={{ background: canNext() ? "#e8ff4a" : "rgba(255,255,255,0.1)", color: canNext() ? "#0a0a0f" : "#444", fontWeight: 600 }}
              >
                ถัดไป →
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isPending || templateWeeksTooShort}
                style={{ background: templateWeeksTooShort ? "rgba(255,255,255,0.1)" : "#e8ff4a", color: templateWeeksTooShort ? "#444" : "#0a0a0f", fontWeight: 600, minWidth: 120 }}
              >
                {isPending ? "กำลังสร้างแผน..." : "สร้างแผน 🏃"}
              </Button>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
