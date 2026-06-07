"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/dashboard", label: "ภาพรวม", icon: "📊" },
  { href: "/plan", label: "แผนซ้อม", icon: "📋" },
  { href: "/profile", label: "โปรไฟล์", icon: "👤" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 flex md:hidden border-t"
      style={{ background: "rgba(10,10,15,0.97)", backdropFilter: "blur(10px)", borderColor: "rgba(255,255,255,0.08)" }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-opacity"
            style={{ opacity: isActive ? 1 : 0.45 }}
          >
            <span className="text-xl">{item.icon}</span>
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive ? "#e8ff4a" : "#888" }}
            >
              {item.label}
            </span>
            {isActive && (
              <div className="absolute bottom-0 w-8 h-0.5 rounded-full" style={{ background: "#e8ff4a" }} />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
