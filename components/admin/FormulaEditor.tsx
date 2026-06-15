"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { saveFormula, resetFormula } from "@/app/actions/admin"
import { PhasePatternEditor } from "@/components/admin/PhasePatternEditor"
import type { FormulaSettings, PaceMultipliers } from "@/types"
import { getFormulaDefault } from "@/lib/formulaDefaults"

const fmtSec = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

const MULTIPLIER_ROWS: { key: keyof PaceMultipliers; label: string; zone: string }[] = [
  { key: "easy",           label: "Easy Run",         zone: "Zone 2" },
  { key: "long",           label: "Long Run",         zone: "Zone 2" },
  { key: "progressive",    label: "Progressive Run",  zone: "Z2→Z4" },
  { key: "fartlek_rolling",label: "Fartlek Rolling",  zone: "Z3–Z4" },
  { key: "fartlek",        label: "Fartlek",          zone: "Z3–Z4" },
  { key: "race_pace",      label: "Race Pace",        zone: "Zone 4" },
  { key: "broken_mile",    label: "Broken Mile",      zone: "Zone 4" },
  { key: "tempo",          label: "Tempo",            zone: "Zone 4 (baseline)" },
  { key: "hills",          label: "Hills",            zone: "Zone 4–5" },
  { key: "pyramid",        label: "Pyramid",          zone: "Zone 5" },
  { key: "drop_set",       label: "Drop Set",         zone: "Zone 5" },
  { key: "interval",       label: "Interval",         zone: "Zone 5" },
  { key: "strides",        label: "Strides",          zone: "Short Z5" },
  { key: "recovery",       label: "Recovery",         zone: "Zone 1" },
  { key: "power_hike",     label: "Power Hike 🥾",    zone: "Z1–Z2" },
]

type Props = { targetDistance: string; initialFormula: FormulaSettings; isCustom: boolean }

function NumInput({ label, value, onChange, unit, hint, min, max, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void
  unit?: string; hint?: string; min?: number; max?: number; step?: number
}) {
  const [raw, setRaw] = useState(String(value))
  // Sync local edit buffer when the controlled value changes — done during render
  // (not in an effect) to avoid cascading re-renders.
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setRaw(String(value))
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: "#777" }}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="number" value={raw} min={min} max={max} step={step}
          onChange={(e) => {
            setRaw(e.target.value)
            const v = parseFloat(e.target.value)
            if (!isNaN(v)) onChange(v)
          }}
          className="w-full h-9 rounded-xl px-3 text-sm font-mono"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e8ff4a" }}
        />
        {unit && <span className="text-xs shrink-0" style={{ color: "#555" }}>{unit}</span>}
      </div>
      {hint && <p className="text-[11px]" style={{ color: "#444" }}>{hint}</p>}
    </div>
  )
}

export function FormulaEditor({ targetDistance, initialFormula, isCustom }: Props) {
  const router = useRouter()
  const [formula, setFormula] = useState<FormulaSettings>(initialFormula)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const [dirty, setDirty] = useState(false)
  const defaults = getFormulaDefault(targetDistance)

  // Auto-dismiss status after 3 s
  useEffect(() => {
    if (!status) return
    const t = setTimeout(() => setStatus(null), 3000)
    return () => clearTimeout(t)
  }, [status])

  const patch = <K extends keyof FormulaSettings>(key: K, val: FormulaSettings[K]) => {
    setFormula((f) => ({ ...f, [key]: val }))
    setDirty(true)
  }

  const setMult = (key: keyof PaceMultipliers, val: number) => {
    setFormula((f) => ({ ...f, paceMultipliers: { ...f.paceMultipliers, [key]: val } }))
    setDirty(true)
  }

  // Preview pace from multiplier × effective base pace
  const previewPace = (mult: number) => {
    const base = formula.defaultRacePace + (formula.terrainModifier ?? 0)
    return fmtSec(Math.max(120, Math.min(1200, Math.round(base * mult))))
  }

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveFormula(targetDistance, formula)
      if ("success" in res) {
        setStatus({ type: "success", msg: "✓ บันทึกสูตรแล้ว" })
        setDirty(false)
        router.refresh()
      } else {
        setStatus({ type: "error", msg: res.error ?? "เกิดข้อผิดพลาด" })
      }
    })
  }

  const handleReset = () => {
    if (!confirm("รีเซ็ตกลับค่า default ทั้งหมด? สูตรที่ปรับไว้จะหายไป")) return
    startTransition(async () => {
      await resetFormula(targetDistance)
      router.push("/admin/formula")
    })
  }

  const sectionStyle = {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
  }

  return (
    <div className="space-y-6">
      {/* Back + dirty indicator */}
      <div className="flex items-center gap-3">
        <Link href="/admin/formula" className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: "#666" }}>
          ← รายการสูตรทั้งหมด
        </Link>
        {dirty && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(232,255,74,0.12)", color: "#e8ff4a" }}>
            ● มีการแก้ไข
          </span>
        )}
      </div>

      {/* ── Volume ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl p-6 space-y-4" style={sectionStyle}>
        <h2 className="font-semibold text-white">📊 ปริมาณการซ้อม (km/week)</h2>
        <div className="grid grid-cols-3 gap-4">
          <NumInput label="Base km/week" value={formula.baseKmPerWeek}
            onChange={(v) => patch("baseKmPerWeek", v)} unit="km" min={5} max={200} />
          <NumInput label="Peak km/week" value={formula.peakKmPerWeek}
            onChange={(v) => patch("peakKmPerWeek", v)} unit="km" min={10} max={300} />
          <NumInput label="Long run max" value={formula.longRunMax}
            onChange={(v) => patch("longRunMax", v)} unit="km" min={3} max={100} />
        </div>
      </section>

      {/* ── Pace Calibration ───────────────────────────────────────── */}
      <section className="rounded-2xl p-6 space-y-4" style={sectionStyle}>
        <div>
          <h2 className="font-semibold text-white">⏱️ Pace Calibration</h2>
          <p className="text-xs mt-0.5" style={{ color: "#555" }}>เพซพื้นฐานเมื่อผู้ใช้ไม่มีข้อมูล PR</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumInput
            label="Default race pace"
            value={formula.defaultRacePace}
            onChange={(v) => patch("defaultRacePace", v)}
            unit="วิ/km"
            hint={`= ${fmtSec(formula.defaultRacePace)}/km`}
            min={120} max={1200}
          />
          <NumInput
            label="Terrain modifier"
            value={formula.terrainModifier}
            onChange={(v) => patch("terrainModifier", v)}
            unit="+วิ/km"
            hint={formula.terrainModifier > 0
              ? `Effective base: ${fmtSec(formula.defaultRacePace + formula.terrainModifier)}/km`
              : "0 = ไม่มี terrain penalty"}
            min={0} max={120}
          />
        </div>
      </section>

      {/* ── Pace Multipliers ──────────────────────────────────────── */}
      <section className="rounded-2xl p-6 space-y-4" style={sectionStyle}>
        <div>
          <h2 className="font-semibold text-white">🎛️ Pace Multipliers</h2>
          <p className="text-xs mt-0.5" style={{ color: "#555" }}>
            ทุก pace คำนวณจาก tempo (×1.00) — ค่ายิ่งมาก ยิ่งช้า
          </p>
        </div>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th className="text-left pb-2 pr-4 text-xs font-medium" style={{ color: "#555" }}>Workout</th>
                <th className="text-left pb-2 pr-4 text-xs font-medium" style={{ color: "#555" }}>Zone</th>
                <th className="text-center pb-2 pr-4 text-xs font-medium" style={{ color: "#555" }}>ตัวคูณ</th>
                <th className="text-center pb-2 pr-4 text-xs font-medium" style={{ color: "#4af0ff" }}>ตัวอย่างเพซ</th>
                <th className="text-left pb-2 text-xs font-medium" style={{ color: "#555" }}>vs Tempo</th>
              </tr>
            </thead>
            <tbody>
              {MULTIPLIER_ROWS.map(({ key, label, zone }) => {
                const val = formula.paceMultipliers[key]
                const isBaseline = key === "tempo"
                return (
                  <tr key={key} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td className="py-2 pr-4">
                      <span className="text-xs font-medium" style={{ color: isBaseline ? "#e8ff4a" : "#ccc" }}>
                        {label}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs" style={{ color: "#444" }}>{zone}</td>
                    <td className="py-2 pr-4 text-center">
                      <input type="number" value={val} min={0.5} max={3.0} step={0.01}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value)
                          if (!isNaN(v)) setMult(key, v)
                        }}
                        className="w-20 h-8 rounded-lg px-2 text-xs font-mono text-center"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e8ff4a" }}
                      />
                    </td>
                    <td className="py-2 pr-4 text-center font-mono text-xs" style={{ color: "#4af0ff" }}>
                      {previewPace(val)}/km
                    </td>
                    <td className="py-2 text-xs" style={{ color: "#444" }}>
                      {isBaseline ? "baseline" : val < 1
                        ? `เร็วกว่า ${((1-val)*100).toFixed(0)}%`
                        : val === 1 ? "เท่ากัน"
                        : `ช้ากว่า ${((val-1)*100).toFixed(0)}%`
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Algorithm Parameters ──────────────────────────────────── */}
      <section className="rounded-2xl p-6 space-y-4" style={sectionStyle}>
        <div>
          <h2 className="font-semibold text-white">🧮 Algorithm Parameters</h2>
          <p className="text-xs mt-0.5" style={{ color: "#555" }}>
            ควบคุมโครงสร้าง periodization — phase boundaries, deload intensity, taper rate
          </p>
        </div>
        {(() => {
          const ap = formula.algorithmParams ?? defaults.algorithmParams ?? {
            phaseBoundaryBase: 0.40, phaseBoundaryBuild: 0.75, phaseBoundaryPeak: 0.90,
            deloadFactor: 0.80, peakOscillation: 0.85, taperFactor: 0.75,
            recoveryWeekInterval: 4, longRunRatioBase: 0.38,
            startKmFactor: 0.90, maxWeeklyIncrease: 0.10,
          }
          const setAp = (key: string, val: number) => {
            patch("algorithmParams", { ...ap, [key]: val })
          }
          const params: { key: string; label: string; hint: string; min: number; max: number; step: number }[] = [
            { key: "phaseBoundaryBase",  label: "Base phase end (%)",  hint: "สัปดาห์ที่กี่ % ของโปรแกรมที่ Base สิ้นสุด — default 40%",  min: 0.1, max: 0.6, step: 0.05 },
            { key: "phaseBoundaryBuild", label: "Build phase end (%)", hint: "% สัปดาห์ที่ Build สิ้นสุด — default 75%", min: 0.4, max: 0.85, step: 0.05 },
            { key: "phaseBoundaryPeak",  label: "Peak phase end (%)",  hint: "% สัปดาห์ที่ Peak สิ้นสุด — default 90%",  min: 0.6, max: 0.95, step: 0.05 },
            { key: "deloadFactor",       label: "Deload factor",       hint: "ลด km กี่เท่าในสัปดาห์ deload — default ×0.80 (ลด 20%)", min: 0.5, max: 0.95, step: 0.05 },
            { key: "peakOscillation",    label: "Peak oscillation",    hint: "hard/easy สลับใน peak — default ×0.85 (สัปดาห์ easy ลด 15%)", min: 0.6, max: 0.99, step: 0.05 },
            { key: "taperFactor",        label: "Taper decay factor",  hint: "Exponential decay ต่อสัปดาห์ใน taper — default 0.75 (ลด 25%/สัปดาห์)", min: 0.4, max: 0.9, step: 0.05 },
            { key: "recoveryWeekInterval", label: "Recovery interval (weeks)", hint: "Deload ทุกกี่สัปดาห์ใน build — default ทุก 4 สัปดาห์", min: 2, max: 8, step: 1 },
            { key: "longRunRatioBase",   label: "Long run ratio (4 days)", hint: "% ของ weekly km สำหรับ long run เมื่อซ้อม 4 วัน/สัปดาห์ — default 38%", min: 0.2, max: 0.55, step: 0.02 },
            { key: "startKmFactor",      label: "Start km factor",     hint: "สัปดาห์แรกเริ่มที่กี่ % ของ base km (เริ่มเบา ค่อยเป็นค่อยไป) — default 90%", min: 0.5, max: 1.0, step: 0.05 },
            { key: "maxWeeklyIncrease",  label: "Max weekly increase", hint: "เพิ่มวอลุ่มได้ไม่เกินกี่ %/สัปดาห์ (10% rule) — default 10%", min: 0.05, max: 0.20, step: 0.01 },
          ]
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {params.map(({ key, label, hint, min, max, step }) => (
                <NumInput key={key} label={label} value={(ap as Record<string, number>)[key] ?? 0}
                  onChange={(v) => setAp(key, v)} hint={hint} min={min} max={max} step={step} />
              ))}
            </div>
          )
        })()}
      </section>

      {/* ── Phase Patterns ────────────────────────────────────────── */}
      <section className="rounded-2xl p-6 space-y-4" style={sectionStyle}>
        <div>
          <h2 className="font-semibold text-white">🔄 Phase Patterns</h2>
          <p className="text-xs mt-0.5" style={{ color: "#555" }}>
            กำหนด workout type ที่ assign ให้แต่ละวันในแต่ละ phase (ไม่รวม long run day)
          </p>
        </div>
        <PhasePatternEditor
          value={formula.phasePatterns}
          onChange={(v) => { patch("phasePatterns", v) }}
          defaultPatterns={defaults.phasePatterns ?? {
            base:  { 3: ["easy","progressive"], 4: ["easy","progressive","easy"], 5: ["easy","progressive","easy","fartlek_rolling"], 6: ["easy","progressive","easy","fartlek_rolling","easy"] },
            build: { 3: ["easy","fartlek_rolling"], 4: ["easy","pyramid","fartlek_rolling"], 5: ["easy","pyramid","easy","drop_set"], 6: ["easy","pyramid","easy","drop_set","fartlek_rolling"] },
            peak:  { 3: ["easy","broken_mile"], 4: ["easy","broken_mile","drop_set"], 5: ["easy","drop_set","easy","broken_mile"], 6: ["easy","drop_set","easy","broken_mile","race_pace"] },
            taper: { 3: ["easy","race_pace"], 4: ["easy","race_pace","progressive"], 5: ["easy","race_pace","easy","progressive"], 6: ["easy","race_pace","easy","progressive","easy"] },
          } as import("@/types").PhasePatternMap}
        />
      </section>

      {/* ── Save actions ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap pb-8">
        <button onClick={handleSave} disabled={isPending}
          className="px-7 py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: dirty ? "#e8ff4a" : "rgba(232,255,74,0.4)",
            color: "#0a0a0f",
            opacity: isPending ? 0.6 : 1,
          }}>
          {isPending ? "⏳ กำลังบันทึก..." : "💾 บันทึกสูตร"}
        </button>

        {isCustom && (
          <button onClick={handleReset} disabled={isPending}
            className="px-4 py-3 rounded-xl text-sm transition-all"
            style={{ background: "rgba(255,74,74,0.08)", color: "#ff6666", border: "1px solid rgba(255,74,74,0.2)" }}>
            ↩ รีเซ็ต default
          </button>
        )}

        {status && (
          <span className="text-sm font-medium" style={{ color: status.type === "success" ? "#4aff8c" : "#ff4a4a" }}>
            {status.msg}
          </span>
        )}
      </div>
    </div>
  )
}
