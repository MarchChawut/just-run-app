"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveFormula, resetFormula } from "@/app/actions/admin"
import type { FormulaSettings, PaceMultipliers } from "@/types"

const MULTIPLIER_LABELS: Record<keyof PaceMultipliers, string> = {
  easy: "Easy Run", long: "Long Run", race_pace: "Race Pace", tempo: "Tempo",
  interval: "Interval", recovery: "Recovery", fartlek: "Fartlek", hills: "Hills",
  strides: "Strides", progressive: "Progressive Run", pyramid: "Pyramid",
  drop_set: "Drop Set", broken_mile: "Broken Mile", fartlek_rolling: "Fartlek Rolling",
  power_hike: "Power Hike",
}

type Props = { targetDistance: string; initialFormula: FormulaSettings; isCustom: boolean }

function NumField({ label, value, onChange, unit, min, max, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void
  unit?: string; min?: number; max?: number; step?: number
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: "#888" }}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="number" value={value} min={min} max={max} step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full h-9 rounded-lg px-3 text-sm font-mono"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
        />
        {unit && <span className="text-xs shrink-0" style={{ color: "#555" }}>{unit}</span>}
      </div>
    </div>
  )
}

export function FormulaEditor({ targetDistance, initialFormula, isCustom }: Props) {
  const router = useRouter()
  const [formula, setFormula] = useState<FormulaSettings>(initialFormula)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  const setMult = (key: keyof PaceMultipliers, val: number) => {
    setFormula((f) => ({ ...f, paceMultipliers: { ...f.paceMultipliers, [key]: val } }))
  }

  // Example pace preview: given race pace = 6:00/km (360s) baseline
  const previewPace = (mult: number) => {
    const sBase = formula.defaultRacePace + (formula.terrainModifier ?? 0)
    const sec = Math.max(120, Math.min(1200, Math.round(sBase * mult)))
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`
  }

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveFormula(targetDistance, formula)
      if ("success" in res) {
        setStatus({ type: "success", msg: "บันทึกสำเร็จ" })
        router.refresh()
      } else {
        setStatus({ type: "error", msg: res.error ?? "เกิดข้อผิดพลาด" })
      }
    })
  }

  const handleReset = () => {
    if (!confirm("รีเซ็ตกลับ default? สูตรที่ปรับไว้จะหายไป")) return
    startTransition(async () => {
      await resetFormula(targetDistance)
      router.push("/admin/formula")
    })
  }

  return (
    <div className="space-y-8">
      {/* ─── Volume section ───────────────────────────────────────────────── */}
      <section className="rounded-xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <h2 className="font-semibold text-white">📊 ปริมาณการซ้อม (km/week)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="Base km/week" value={formula.baseKmPerWeek} onChange={(v) => setFormula((f) => ({ ...f, baseKmPerWeek: v }))} unit="km" min={5} max={200} />
          <NumField label="Peak km/week" value={formula.peakKmPerWeek} onChange={(v) => setFormula((f) => ({ ...f, peakKmPerWeek: v }))} unit="km" min={10} max={300} />
          <NumField label="Long run max" value={formula.longRunMax} onChange={(v) => setFormula((f) => ({ ...f, longRunMax: v }))} unit="km" min={3} max={100} />
        </div>
      </section>

      {/* ─── Pace calibration ─────────────────────────────────────────────── */}
      <section className="rounded-xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <h2 className="font-semibold text-white">⏱️ Pace Calibration</h2>
        <div className="grid grid-cols-2 gap-4">
          <NumField label="Default race pace (ไม่มี PR)" value={formula.defaultRacePace}
            onChange={(v) => setFormula((f) => ({ ...f, defaultRacePace: v }))} unit="sec/km" min={120} max={1200} />
          <NumField label="Terrain modifier" value={formula.terrainModifier}
            onChange={(v) => setFormula((f) => ({ ...f, terrainModifier: v }))} unit="+sec/km" min={0} max={120} />
        </div>
        <p className="text-xs" style={{ color: "#555" }}>
          Default race pace: {Math.floor(formula.defaultRacePace / 60)}:{String(formula.defaultRacePace % 60).padStart(2, "0")}/km
          {formula.terrainModifier > 0 && ` + ${formula.terrainModifier}s terrain = ${Math.floor((formula.defaultRacePace + formula.terrainModifier) / 60)}:${String((formula.defaultRacePace + formula.terrainModifier) % 60).padStart(2, "0")}/km effective`}
        </p>
      </section>

      {/* ─── Pace multipliers ─────────────────────────────────────────────── */}
      <section className="rounded-xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div>
          <h2 className="font-semibold text-white">🎛️ Pace Multipliers</h2>
          <p className="text-xs mt-0.5" style={{ color: "#555" }}>
            ตัวคูณจาก tempo baseline (×1.00) — ตัวอย่าง preview ใช้ default race pace ด้านบน
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs" style={{ color: "#555" }}>
                <th className="text-left py-2 pr-4">Workout Type</th>
                <th className="text-center py-2 pr-4">Multiplier</th>
                <th className="text-center py-2 pr-4">Pace Preview</th>
                <th className="text-left py-2">ความหมาย</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(MULTIPLIER_LABELS) as (keyof PaceMultipliers)[]).map((key) => {
                const val = formula.paceMultipliers[key]
                return (
                  <tr key={key} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="py-2 pr-4 font-mono text-xs" style={{ color: "#ccc" }}>{MULTIPLIER_LABELS[key]}</td>
                    <td className="py-2 pr-4">
                      <input type="number" value={val} min={0.5} max={3.0} step={0.01}
                        onChange={(e) => setMult(key, parseFloat(e.target.value) || 1)}
                        className="w-20 h-8 rounded px-2 text-xs font-mono text-center"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e8ff4a" }}
                      />
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-center" style={{ color: "#4af0ff" }}>
                      {previewPace(val)}/km
                    </td>
                    <td className="py-2 text-xs" style={{ color: "#555" }}>
                      {val < 1 ? `เร็วกว่า tempo ${((1 - val) * 100).toFixed(0)}%` : val === 1 ? "= tempo baseline" : `ช้ากว่า tempo ${((val - 1) * 100).toFixed(0)}%`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Phase patterns (JSON) ─────────────────────────────────────────── */}
      <section className="rounded-xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div>
          <h2 className="font-semibold text-white">🔄 Phase Patterns (optional)</h2>
          <p className="text-xs mt-0.5" style={{ color: "#555" }}>
            JSON object กำหนด workout type ต่อ phase+จำนวนวัน — ปล่อยว่างเพื่อใช้ pattern default
          </p>
        </div>
        <textarea
          rows={8}
          value={formula.phasePatterns ? JSON.stringify(formula.phasePatterns, null, 2) : ""}
          onChange={(e) => {
            if (!e.target.value.trim()) {
              setFormula((f) => ({ ...f, phasePatterns: undefined }))
              return
            }
            try {
              const parsed = JSON.parse(e.target.value)
              setFormula((f) => ({ ...f, phasePatterns: parsed }))
            } catch { /* invalid JSON while typing — ignore */ }
          }}
          placeholder={`{\n  "base": { "3": ["easy", "hills"], "4": ["easy", "hills", "progressive"] },\n  "build": { "3": ["hills", "power_hike"], "4": ["hills", "power_hike", "fartlek_rolling"] },\n  "peak": { "3": ["hills", "race_pace"], "4": ["hills", "race_pace", "power_hike"] },\n  "taper": { "3": ["easy", "race_pace"], "4": ["easy", "race_pace", "easy"] }\n}`}
          className="w-full rounded-lg px-3 py-2 text-xs font-mono resize-y"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#ccc", minHeight: "160px" }}
        />
      </section>

      {/* ─── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={handleSave} disabled={isPending}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "#e8ff4a", color: "#0a0a0f", opacity: isPending ? 0.6 : 1 }}>
          {isPending ? "กำลังบันทึก..." : "💾 บันทึกสูตร"}
        </button>
        {isCustom && (
          <button onClick={handleReset} disabled={isPending}
            className="px-4 py-2.5 rounded-xl text-sm"
            style={{ background: "rgba(255,74,74,0.12)", color: "#ff4a4a", border: "1px solid rgba(255,74,74,0.25)" }}>
            ↩ รีเซ็ต default
          </button>
        )}
        {status && (
          <span className="text-sm" style={{ color: status.type === "success" ? "#4aff8c" : "#ff4a4a" }}>
            {status.msg}
          </span>
        )}
      </div>
    </div>
  )
}
