import { getFormula } from "@/app/actions/admin"
import { FormulaEditor } from "@/components/admin/FormulaEditor"
import { TARGET_DISTANCE_LABELS, TARGET_DISTANCE_ICONS } from "@/types"

type Props = { params: Promise<{ distance: string }> }

export default async function FormulaDetailPage({ params }: Props) {
  const { distance } = await params
  const result = await getFormula(distance)
  if ("error" in result || !("formula" in result)) return <div style={{ color: "#ff4a4a" }}>ไม่มีสิทธิ์เข้าถึง</div>

  const label = TARGET_DISTANCE_LABELS[distance as keyof typeof TARGET_DISTANCE_LABELS] ?? distance
  const icon = TARGET_DISTANCE_ICONS[distance as keyof typeof TARGET_DISTANCE_ICONS] ?? "🏃"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <h1 className="text-2xl font-bold text-white">สูตร {label}</h1>
          <p className="text-sm" style={{ color: "#666" }}>
            {result.isCustom ? `ปรับล่าสุดโดย ${result.updatedBy ?? "—"} · ${result.updatedAt ? new Date(result.updatedAt).toLocaleString("th-TH") : ""}` : "ใช้ค่า default อยู่"}
          </p>
        </div>
      </div>
      <FormulaEditor targetDistance={distance} initialFormula={result.formula} isCustom={result.isCustom} />
    </div>
  )
}
