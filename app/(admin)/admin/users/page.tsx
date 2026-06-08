import { getUsers } from "@/app/actions/admin"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TARGET_DISTANCE_LABELS, TARGET_DISTANCE_ICONS } from "@/types"

export default async function UsersPage() {
  const result = await getUsers()
  const users = "success" in result ? result.users : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">ผู้ใช้งาน</h1>
        <p className="text-sm mt-1" style={{ color: "#666" }}>
          {users.length} คน · ดูข้อมูลอย่างเดียว ไม่สามารถแก้ไข
        </p>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
          <div className="text-5xl mb-3">👥</div>
          <p className="text-sm" style={{ color: "#555" }}>ยังไม่มีผู้ใช้</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const activePlan = user.plans.find((p) => p.isActive)
            const lastSession = user.sessions[0]
            const lastActive = lastSession
              ? new Date(lastSession.expires).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
              : "—"
            const joined = new Date(user.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })

            return (
              <div key={user.id} className="flex items-center gap-4 px-5 py-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>

                {/* Avatar */}
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                  <AvatarFallback style={{ background: "rgba(232,255,74,0.15)", color: "#e8ff4a", fontSize: 14 }}>
                    {user.name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name ?? "—"}</p>
                  <p className="text-xs truncate" style={{ color: "#666" }}>{user.email}</p>
                </div>

                {/* Active plan */}
                <div className="hidden sm:block text-center shrink-0">
                  <p className="text-xs font-mono" style={{ color: "#888" }}>
                    {activePlan
                      ? `${TARGET_DISTANCE_ICONS[activePlan.targetDistance as keyof typeof TARGET_DISTANCE_ICONS] ?? "🏃"} ${TARGET_DISTANCE_LABELS[activePlan.targetDistance as keyof typeof TARGET_DISTANCE_LABELS] ?? activePlan.targetDistance}`
                      : <span style={{ color: "#444" }}>ไม่มีแผน</span>
                    }
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "#555" }}>{user.plans.length} แผนรวม</p>
                </div>

                {/* Completions */}
                <div className="hidden md:block text-center shrink-0 w-16">
                  <p className="text-sm font-mono font-bold" style={{ color: "#4af0ff" }}>{user.completions.length}</p>
                  <p className="text-[11px]" style={{ color: "#555" }}>workouts</p>
                </div>

                {/* Profile intensity */}
                {user.profile && (
                  <div className="hidden md:block text-center shrink-0 w-20">
                    <p className="text-xs" style={{ color: "#888" }}>{user.profile.intensity ?? "—"}</p>
                    {user.profile.age && <p className="text-[11px]" style={{ color: "#555" }}>อายุ {user.profile.age}</p>}
                  </div>
                )}

                {/* Dates */}
                <div className="text-right shrink-0">
                  <p className="text-[11px]" style={{ color: "#555" }}>สมัคร {joined}</p>
                  <p className="text-[11px]" style={{ color: "#444" }}>active {lastActive}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
