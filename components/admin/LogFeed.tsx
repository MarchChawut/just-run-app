"use client"

import { useState, useTransition } from "react"
import { getLogs } from "@/app/actions/admin"

type LogEntry = {
  id: string
  userId: string | null
  userEmail: string | null
  action: string
  detail: unknown
  createdAt: Date
}

const ACTION_META: Record<string, { label: string; color: string; icon: string }> = {
  user_signed_up:   { label: "สมัครใหม่",        color: "#4aff8c", icon: "🆕" },
  plan_created:     { label: "สร้างแผน",          color: "#e8ff4a", icon: "📋" },
  plan_updated:     { label: "แก้ไขแผน",          color: "#e8ff4a", icon: "✏️" },
  plan_deleted:     { label: "ลบแผน",             color: "#ff4a4a", icon: "🗑️" },
  completion_saved: { label: "บันทึก workout",    color: "#4af0ff", icon: "✅" },
  profile_updated:  { label: "อัปเดตโปรไฟล์",     color: "#c8ff4a", icon: "👤" },
  formula_updated:  { label: "แก้สูตร (admin)",   color: "#ff9f4a", icon: "⚙️" },
  formula_reset:    { label: "รีเซ็ตสูตร (admin)", color: "#ff6666", icon: "↩" },
  meal_created:     { label: "เพิ่มเมนู (admin)", color: "#74c8ff", icon: "🍱" },
  meal_updated:     { label: "แก้เมนู (admin)",   color: "#74c8ff", icon: "✏️" },
  meal_deleted:     { label: "ลบเมนู (admin)",    color: "#ff8888", icon: "🗑️" },
}

function DetailText({ detail }: { detail: unknown }) {
  if (!detail || typeof detail !== "object") return null
  const d = detail as Record<string, unknown>
  const parts = []
  if (d.targetDistance) parts.push(`distance: ${d.targetDistance}`)
  if (d.trainingWeeks) parts.push(`${d.trainingWeeks} สัปดาห์`)
  if (d.name) parts.push(`"${d.name}"`)
  if (d.weekNumber !== undefined) parts.push(`week ${d.weekNumber}, day ${d.dayIndex}`)
  if (d.completion !== undefined) parts.push(`${d.completion}%`)
  if (d.intensity) parts.push(`intensity: ${d.intensity}`)
  if (parts.length === 0) return <span style={{ color: "#333" }}>{JSON.stringify(detail).slice(0, 80)}</span>
  return <span style={{ color: "#555" }}>{parts.join(" · ")}</span>
}

export function LogFeed({ initialLogs, initialCursor }: { initialLogs: LogEntry[]; initialCursor: string | null }) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [filterAction, setFilterAction] = useState<string>("all")
  const [isPending, startTransition] = useTransition()

  const loadMore = () => {
    if (!cursor) return
    startTransition(async () => {
      const res = await getLogs({ cursor, limit: 50, action: filterAction === "all" ? undefined : filterAction })
      if ("success" in res) {
        setLogs((prev) => [...prev, ...res.logs as LogEntry[]])
        setCursor(res.nextCursor)
      }
    })
  }

  const applyFilter = (action: string) => {
    setFilterAction(action)
    startTransition(async () => {
      const res = await getLogs({ limit: 50, action: action === "all" ? undefined : action })
      if ("success" in res) {
        setLogs(res.logs as LogEntry[])
        setCursor(res.nextCursor)
      }
    })
  }

  const filtered = logs

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => applyFilter("all")}
          className="px-3 py-1 rounded-full text-xs transition-all"
          style={{ background: filterAction === "all" ? "#e8ff4a" : "rgba(255,255,255,0.05)", color: filterAction === "all" ? "#0a0a0f" : "#777" }}>
          ทั้งหมด
        </button>
        {[["plan_created","plan_deleted","plan_updated"], ["completion_saved"], ["user_signed_up"], ["formula_updated","formula_reset"], ["meal_created","meal_updated","meal_deleted"]].map((group) => {
          const first = group[0]
          const meta = ACTION_META[first]
          const active = group.includes(filterAction)
          return (
            <button key={first} onClick={() => applyFilter(first)}
              className="px-3 py-1 rounded-full text-xs transition-all"
              style={{ background: active ? `${meta.color}22` : "rgba(255,255,255,0.05)", color: active ? meta.color : "#666", border: `1px solid ${active ? meta.color + "44" : "transparent"}` }}>
              {meta.icon} {group.length > 1 ? first.split("_")[0] : meta.label}
            </button>
          )
        })}
      </div>

      {/* Log entries */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
          <p className="text-sm" style={{ color: "#555" }}>ไม่มี activity log ในหมวดนี้</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((log) => {
            const meta = ACTION_META[log.action] ?? { label: log.action, color: "#888", icon: "•" }
            const time = new Date(log.createdAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
            return (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                {/* Icon */}
                <span className="text-base shrink-0 mt-0.5">{meta.icon}</span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${meta.color}18`, color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="text-xs truncate" style={{ color: "#555" }}>
                      {log.userEmail ?? "admin"}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5">
                    <DetailText detail={log.detail} />
                  </div>
                </div>

                {/* Time */}
                <span className="text-[11px] shrink-0" style={{ color: "#444" }}>{time}</span>
              </div>
            )
          })}
        </div>
      )}

      {cursor && (
        <div className="text-center pt-2">
          <button onClick={loadMore} disabled={isPending}
            className="px-6 py-2 rounded-xl text-sm transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "#888", opacity: isPending ? 0.6 : 1 }}>
            {isPending ? "⏳ กำลังโหลด..." : "โหลดเพิ่มเติม"}
          </button>
        </div>
      )}
    </div>
  )
}
