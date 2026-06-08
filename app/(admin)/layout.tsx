import { requireAdmin } from "@/lib/auth-utils"
import Link from "next/link"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3 flex items-center gap-6" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <Link href="/admin" className="text-sm font-bold" style={{ color: "#e8ff4a" }}>⚙️ Admin</Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/admin/formula" className="hover:text-white transition-colors" style={{ color: "#888" }}>สูตรโปรแกรม</Link>
          <Link href="/admin/meals" className="hover:text-white transition-colors" style={{ color: "#888" }}>เมนูอาหาร</Link>
        </nav>
        <Link href="/dashboard" className="ml-auto text-xs" style={{ color: "#555" }}>← กลับแอป</Link>
      </header>
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  )
}
