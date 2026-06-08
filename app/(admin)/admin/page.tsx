import { getAdminStats } from "@/app/actions/admin"
import Link from "next/link"

export default async function AdminPage() {
  const result = await getAdminStats()
  const stats = "success" in result ? result : null

  const cards = [
    { label: "ผู้ใช้ทั้งหมด", value: stats?.userCount ?? "—", icon: "👥", href: null },
    { label: "แผนซ้อมทั้งหมด", value: stats?.planCount ?? "—", icon: "📋", href: null },
    { label: "สูตรที่ปรับแล้ว", value: `${stats?.formulaCount ?? 0}/8`, icon: "🔢", href: "/admin/formula" },
    { label: "เมนูอาหาร (active)", value: stats?.mealCount ?? "—", icon: "🍱", href: "/admin/meals" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "#666" }}>จัดการสูตรโปรแกรมวิ่งและเมนูอาหาร</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl p-4 space-y-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-2xl">{c.icon}</div>
            <div className="text-2xl font-bold font-mono" style={{ color: "#e8ff4a" }}>{String(c.value)}</div>
            <div className="text-xs" style={{ color: "#666" }}>{c.label}</div>
            {c.href && <Link href={c.href} className="text-xs underline" style={{ color: "#4af0ff" }}>จัดการ →</Link>}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/admin/formula" className="rounded-xl p-5 flex items-start gap-4 hover:border-yellow-400/40 transition-colors"
          style={{ background: "rgba(232,255,74,0.04)", border: "1px solid rgba(232,255,74,0.15)" }}>
          <span className="text-3xl">🔢</span>
          <div>
            <h2 className="font-semibold text-white">สูตรโปรแกรมวิ่ง</h2>
            <p className="text-sm mt-1" style={{ color: "#888" }}>ปรับ pace multipliers, weekly volume, default race pace แยกตามระยะ (5K / 10K / Half / Full / Ultra / Trail)</p>
          </div>
        </Link>
        <Link href="/admin/meals" className="rounded-xl p-5 flex items-start gap-4 hover:border-cyan-400/40 transition-colors"
          style={{ background: "rgba(74,240,255,0.04)", border: "1px solid rgba(74,240,255,0.15)" }}>
          <span className="text-3xl">🍱</span>
          <div>
            <h2 className="font-semibold text-white">เมนูอาหาร</h2>
            <p className="text-sm mt-1" style={{ color: "#888" }}>เพิ่ม/แก้ไข/ปิด เมนูอาหารแนะนำสำหรับแต่ละประเภทการวิ่ง (easy/long/hard/rest)</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
