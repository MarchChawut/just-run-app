import { requireAdmin } from "@/lib/auth-utils"
import Link from "next/link"
import { AdminNav } from "@/components/admin/AdminNav"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()
  const email = session.user?.email ?? ""

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b"
        style={{ background: "rgba(10,10,15,0.95)", backdropFilter: "blur(8px)", borderColor: "rgba(232,255,74,0.12)" }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          {/* Brand */}
          <Link href="/admin" className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-bold" style={{ color: "#e8ff4a" }}>⚙️</span>
            <span className="text-sm font-semibold text-white">Admin</span>
          </Link>

          {/* Divider */}
          <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>

          {/* Nav links with active state */}
          <AdminNav />

          {/* Right: user + back to app */}
          <div className="ml-auto flex items-center gap-4">
            <span className="text-xs hidden sm:block" style={{ color: "#444" }}>{email}</span>
            <Link href="/dashboard"
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", color: "#666", border: "1px solid rgba(255,255,255,0.08)" }}>
              ← กลับแอป
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
