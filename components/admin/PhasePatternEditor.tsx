"use client"

import { useState } from "react"
import type { PhasePatternMap, TrainingPhase } from "@/types"
import { WORKOUT_LABELS, WORKOUT_COLORS } from "@/types"
import type { WorkoutType } from "@/types"

const PHASES: { key: TrainingPhase; label: string; color: string }[] = [
  { key: "base",  label: "Base",  color: "#4af0ff" },
  { key: "build", label: "Build", color: "#ff9f4a" },
  { key: "peak",  label: "Peak",  color: "#ff4a4a" },
  { key: "taper", label: "Taper", color: "#b44aff" },
]
const DAY_COUNTS = [3, 4, 5, 6]

const ALL_WORKOUT_TYPES: WorkoutType[] = [
  "easy", "long", "tempo", "interval", "race_pace", "recovery", "hills",
  "fartlek", "fartlek_rolling", "progressive", "pyramid", "drop_set",
  "broken_mile", "strides", "cross_train", "power_hike",
]

type Props = {
  value: PhasePatternMap | undefined
  onChange: (v: PhasePatternMap | undefined) => void
  defaultPatterns: PhasePatternMap
}

function WorkoutChip({ type, onRemove }: { type: string; onRemove: () => void }) {
  const color = WORKOUT_COLORS[type as WorkoutType] ?? "#888"
  const label = WORKOUT_LABELS[type as WorkoutType] ?? type
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {label.split(" ")[0]}
      <button onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100 leading-none">×</button>
    </span>
  )
}

export function PhasePatternEditor({ value, onChange, defaultPatterns }: Props) {
  const [showDropdown, setShowDropdown] = useState<string | null>(null) // "base-4"

  // Merge value with defaultPatterns so we always have a complete grid
  const getPattern = (phase: TrainingPhase, days: number): string[] => {
    const key = String(days)
    return value?.[phase]?.[key]
      ?? (value?.[phase]?.[days as unknown as string] as string[] | undefined)
      ?? defaultPatterns[phase]?.[days]
      ?? []
  }

  const setPattern = (phase: TrainingPhase, days: number, types: string[]) => {
    const current = value ?? { base: {}, build: {}, peak: {}, taper: {} }
    const updated: PhasePatternMap = {
      ...current,
      [phase]: { ...current[phase], [String(days)]: types },
    }
    onChange(updated)
  }

  const addWorkout = (phase: TrainingPhase, days: number, type: string) => {
    const current = getPattern(phase, days)
    if (!current.includes(type)) setPattern(phase, days, [...current, type])
    setShowDropdown(null)
  }

  const removeWorkout = (phase: TrainingPhase, days: number, idx: number) => {
    const current = getPattern(phase, days)
    setPattern(phase, days, current.filter((_, i) => i !== idx))
  }

  const resetToDefault = () => onChange(undefined)

  return (
    <div className="space-y-3">
      {/* Instructions */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "#555" }}>
          แต่ละ cell = ลำดับ workout types ที่ assign ให้วันที่ไม่ใช่ long run
        </p>
        <button onClick={resetToDefault} className="text-xs px-3 py-1 rounded-lg transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", color: "#666", border: "1px solid rgba(255,255,255,0.08)" }}>
          ↩ ใช้ default
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto -mx-2">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr>
              <th className="w-20 pb-2 text-left text-xs font-medium" style={{ color: "#555" }}>Phase</th>
              {DAY_COUNTS.map((d) => (
                <th key={d} className="pb-2 text-center text-xs font-medium" style={{ color: "#555" }}>{d} วัน/สัปดาห์</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PHASES.map(({ key: phase, label, color }) => (
              <tr key={phase} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <td className="py-3 pr-2 align-top">
                  <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                </td>
                {DAY_COUNTS.map((days) => {
                  const pattern = getPattern(phase, days)
                  const cellKey = `${phase}-${days}`
                  const available = ALL_WORKOUT_TYPES.filter((t) => !pattern.includes(t))
                  return (
                    <td key={days} className="py-3 px-2 align-top" style={{ verticalAlign: "top", minWidth: "120px" }}>
                      <div className="flex flex-wrap gap-1">
                        {pattern.map((type, idx) => (
                          <WorkoutChip key={`${type}-${idx}`} type={type}
                            onRemove={() => removeWorkout(phase, days, idx)} />
                        ))}

                        {/* Add button */}
                        <div className="relative">
                          <button
                            onClick={() => setShowDropdown(showDropdown === cellKey ? null : cellKey)}
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs transition-colors"
                            style={{ background: "rgba(255,255,255,0.08)", color: "#555" }}>
                            +
                          </button>
                          {showDropdown === cellKey && (
                            <div className="absolute z-50 top-6 left-0 rounded-xl shadow-xl p-2 space-y-0.5 w-44"
                              style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)" }}>
                              {available.map((type) => {
                                const c = WORKOUT_COLORS[type] ?? "#888"
                                return (
                                  <button key={type} onClick={() => addWorkout(phase, days, type)}
                                    className="w-full text-left px-2 py-1 rounded-lg text-xs transition-colors hover:bg-white/5"
                                    style={{ color: c }}>
                                    {WORKOUT_LABELS[type]}
                                  </button>
                                )
                              })}
                              {available.length === 0 && (
                                <p className="text-xs px-2 py-1" style={{ color: "#555" }}>ครบทุกประเภทแล้ว</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Close dropdown on outside click (simple overlay) */}
      {showDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(null)} />
      )}
    </div>
  )
}
