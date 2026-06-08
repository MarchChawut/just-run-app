"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { saveFormula, resetFormula } from "@/app/actions/admin"
import type { FormulaSettings, PaceMultipliers } from "@/types"

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
  useEffect(() => { setRaw(String(value)) }, [value])

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
  const [jsonText, setJsonText] = useState(
    formula.phasePatterns ? JSON.stringify(formula.phasePatterns, null, 2) : ""
  )
  const [jsonError, setJsonError] = useState("")
  const [dirty, setDirty] = useState(false)

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

  const handleJsonChange = (text: string) => {
    setJsonText(text)
    setDirty(true)
    if (!text.trim()) {
      setFormula((f) => ({ ...f, phasePatterns: undefined }))
      setJsonError("")
      return
    }
    try {
      const parsed = JSON.parse(text)
      setFormula((f) => ({ ...f, phasePatterns: parsed }))
      setJsonError("")
    } catch {
      setJsonError("JSON ไม่ถูกต้อง — ยังบันทึกไม่ได้")
    }
  }

  const handleSave = () => {
    if (jsonError) { setStatus({ type: "error", msg: jsonError }); return }
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

      {/* ── Phase Patterns ────────────────────────────────────────── */}
      <section className="rounded-2xl p-6 space-y-3" style={sectionStyle}>
        <div>
          <h2 className="font-semibold text-white">🔄 Phase Patterns <span className="text-xs font-normal" style={{ color: "#555" }}>(optional)</span></h2>
          <p className="text-xs mt-0.5" style={{ color: "#555" }}>
            JSON กำหนด workout types ต่อ phase + จำนวนวัน — ว่าง = ใช้ default pattern
          </p>
        </div>
        <textarea
          rows={10}
          value={jsonText}
          onChange={(e) => handleJsonChange(e.target.value)}
          placeholder={`{\n  "base":  { "3": ["easy","hills"],             "4": ["easy","hills","progressive"] },\n  "build": { "3": ["hills","power_hike"],        "4": ["hills","power_hike","fartlek_rolling"] },\n  "peak":  { "3": ["hills","race_pace"],          "4": ["hills","race_pace","power_hike"] },\n  "taper": { "3": ["easy","race_pace"],           "4": ["easy","race_pace","easy"] }\n}`}
          className="w-full rounded-xl px-4 py-3 text-xs font-mono resize-y"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${jsonError ? "#ff4a4a" : "rgba(255,255,255,0.08)"}`,
            color: jsonError ? "#ff8888" : "#bbb",
            minHeight: "180px",
          }}
        />
        {jsonError && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "#ff4a4a" }}>
            <span>⚠</span> {jsonError}
          </p>
        )}
        {!jsonText.trim() && (
          <p className="text-xs" style={{ color: "#444" }}>
            ✓ ใช้ pattern default — trail ใช้ hill-heavy patterns, road ใช้ sports science patterns
          </p>
        )}
      </section>

      {/* ── Save actions ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap pb-8">
        <button onClick={handleSave} disabled={isPending || !!jsonError}
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
