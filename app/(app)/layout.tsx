import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/Navbar"
import { Sidebar } from "@/components/layout/Sidebar"
import { BottomNav } from "@/components/layout/BottomNav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id, name, email, image } = session.user

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar user={{ id, name, email, image }} />
      <div className="flex flex-1 min-h-0">
        {/* Sidebar: desktop only */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        {/* Main content: extra bottom padding on mobile for BottomNav */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      {/* Bottom nav: mobile only */}
      <BottomNav />
    </div>
  )
}
