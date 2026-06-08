import { getAdminStats } from "@/app/actions/admin"
import Link from "next/link"

const ACTION_META: Record<string, { label: string; color: string; icon: string }> = {
  user_signed_up:   { label: "สมัครใหม่",        color: "#4aff8c", icon: "🆕" },
  plan_created:     { label: "สร้างแผน",          color: "#e8ff4a", icon: "📋" },
  plan_updated:     { label: "แก้ไขแผน",          color: "#e8ff4a", icon: "✏️" },
  plan_deleted:     { label: "ลบแผน",             color: "#ff4a4a", icon: "🗑️" },
  completion_saved: { label: "บันทึก workout",    color: "#4af0ff", icon: "✅" },
  profile_updated:  { label: "อัปเดตโปรไฟล์",     color: "#c8ff4a", icon: "👤" },
  formula_updated:  { label: "แก้สูตร",           color: "#ff9f4a", icon: "⚙️" },
  formula_reset:    { label: "รีเซ็ตสูตร",        color: "#ff6666", icon: "↩" },
  meal_created:     { label: "เพิ่มเมนู",          color: "#74c8ff", icon: "🍱" },
  meal_updated:     { label: "แก้เมนู",            color: "#74c8ff", icon: "✏️" },
  meal_deleted:     { label: "ลบเมนู",             color: "#ff8888", icon: "🗑️" },
}

export default async function AdminPage() {
  const result = await getAdminStats()
  const data = "success" in result ? result : null

  const stats = [
    { label: "ผู้ใช้ทั้งหมด",   value: data?.userCount ?? "—",       icon: "👥", href: "/admin/users", color: "#4aff8c" },
    { label: "แผนซ้อม",         value: data?.planCount ?? "—",        icon: "📋", href: null,           color: "#e8ff4a" },
    { label: "แผน Active",       value: data?.activePlanCount ?? "—",  icon: "⚡", href: null,           color: "#4af0ff" },
    { label: "สูตรที่ปรับแล้ว",  value: `${data?.formulaCount ?? 0}/8`, icon: "🔢", href: "/admin/formula", color: "#ff9f4a" },
    { label: "เมนูอาหาร",        value: data?.mealCount ?? "—",        icon: "🍱", href: "/admin/meals",  color: "#74c8ff" },
  ]

  const recentLogs = data?.recentLogs ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "#666" }}>จัดการสูตร เมนูอาหาร ผู้ใช้ และ activity logs</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label}
            className="rounded-xl p-4 space-y-1"
            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${s.color}22` }}>
            <div className="text-2xl">{s.icon}</div>
            <div className="text-xl font-bold font-mono" style={{ color: s.color }}>{String(s.value)}</div>
            <div className="text-xs" style={{ color: "#666" }}>{s.label}</div>
            {s.href && (
              <Link href={s.href} className="text-xs" style={{ color: "#444" }}>จัดการ →</Link>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/admin/formula", label: "สูตรโปรแกรม", desc: "ปรับ algorithm, pace, phase patterns", icon: "🔢", color: "#ff9f4a" },
          { href: "/admin/meals",   label: "เมนูอาหาร",   desc: "เพิ่ม/แก้ไขเมนูแนะนำ",             icon: "🍱", color: "#4af0ff" },
          { href: "/admin/users",   label: "ผู้ใช้งาน",   desc: "ดูรายชื่อและสถิติผู้ใช้",           icon: "👥", color: "#4aff8c" },
          { href: "/admin/logs",    label: "Activity Log", desc: "ทุก action ของผู้ใช้และ admin",    icon: "📋", color: "#e8ff4a" },
        ].map((q) => (
          <Link key={q.href} href={q.href}
            className="rounded-xl p-4 space-y-2 transition-all hover:border-white/15"
            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${q.color}20` }}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{q.icon}</span>
              <span className="font-semibold text-sm text-white">{q.label}</span>
            </div>
            <p className="text-xs" style={{ color: "#666" }}>{q.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Activity ล่าสุด</h2>
          <Link href="/admin/logs" className="text-xs" style={{ color: "#555" }}>ดูทั้งหมด →</Link>
        </div>
        {recentLogs.length === 0 ? (
          <div className="rounded-xl px-5 py-4 text-sm" style={{ background: "rgba(255,255,255,0.02)", color: "#444" }}>
            ยังไม่มี activity — จะปรากฏเมื่อผู้ใช้เริ่มใช้งาน
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentLogs.map((log) => {
              const meta = ACTION_META[log.action] ?? { label: log.action, color: "#888", icon: "•" }
              const time = new Date(log.createdAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
              return (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <span>{meta.icon}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${meta.color}18`, color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="text-xs flex-1 truncate" style={{ color: "#555" }}>
                    {log.userEmail ?? "admin"}
                  </span>
                  <span className="text-[11px] shrink-0" style={{ color: "#444" }}>{time}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
