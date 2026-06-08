import { getLogs } from "@/app/actions/admin"
import { LogFeed } from "@/components/admin/LogFeed"

export default async function LogsPage() {
  const result = await getLogs({ limit: 50 })
  const { logs = [], nextCursor = null } = "success" in result ? result : {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Activity Log</h1>
        <p className="text-sm mt-1" style={{ color: "#666" }}>
          ทุก action ของผู้ใช้และ admin — อัปเดต real-time
        </p>
      </div>
      <LogFeed initialLogs={logs} initialCursor={nextCursor} />
    </div>
  )
}
