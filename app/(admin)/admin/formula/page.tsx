import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { FORMULA_DEFAULTS } from "@/lib/formulaDefaults"
import { TARGET_DISTANCE_LABELS, TARGET_DISTANCE_ICONS } from "@/types"

export default async function FormulaListPage() {
  const customRows = await prisma.formulaConfig.findMany().catch(() => [])
  const customSet = new Set(customRows.map((r) => r.targetDistance))

  const distances = Object.keys(FORMULA_DEFAULTS) as (keyof typeof FORMULA_DEFAULTS)[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">สูตรโปรแกรมวิ่ง</h1>
        <p className="text-sm mt-1" style={{ color: "#666" }}>สูตรที่ปรับแล้วจะถูกใช้ทันทีสำหรับแผนใหม่ — แผนเก่าไม่ได้รับผลกระทบ</p>
      </div>

      <div className="space-y-2">
        {distances.map((dist) => {
          const isCustom = customSet.has(dist)
          const custom = customRows.find((r) => r.targetDistance === dist)
          const defaults = FORMULA_DEFAULTS[dist]
          return (
            <Link key={dist} href={`/admin/formula/${dist}`}
              className="flex items-center gap-4 px-5 py-4 rounded-xl hover:border-white/20 transition-colors"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${isCustom ? "rgba(232,255,74,0.3)" : "rgba(255,255,255,0.08)"}` }}>
              <span className="text-2xl">{TARGET_DISTANCE_ICONS[dist as keyof typeof TARGET_DISTANCE_ICONS] ?? "🏃"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{TARGET_DISTANCE_LABELS[dist as keyof typeof TARGET_DISTANCE_LABELS] ?? dist}</span>
                  {isCustom ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(232,255,74,0.15)", color: "#e8ff4a" }}>ปรับแล้ว</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#666" }}>default</span>
                  )}
                </div>
                <p className="text-xs mt-0.5 font-mono" style={{ color: "#666" }}>
                  Base {defaults.baseKmPerWeek}km → Peak {defaults.peakKmPerWeek}km · Default pace {Math.floor(defaults.defaultRacePace / 60)}:{String(defaults.defaultRacePace % 60).padStart(2, "0")}/km
                  {isCustom && custom?.updatedBy && <span className="ml-2">· แก้โดย {custom.updatedBy}</span>}
                </p>
              </div>
              <span style={{ color: "#444" }}>→</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
