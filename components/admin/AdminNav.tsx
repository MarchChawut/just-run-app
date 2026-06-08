"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"

const NAV = [
  { href: "/admin/formula", label: "🔢 สูตรโปรแกรม" },
  { href: "/admin/meals",   label: "🍱 เมนูอาหาร" },
]

export function AdminNav() {
  const path = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {NAV.map(({ href, label }) => {
        const active = path === href || path.startsWith(href + "/")
        return (
          <Link key={href} href={href}
            className="text-sm px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: active ? "rgba(232,255,74,0.12)" : "transparent",
              color: active ? "#e8ff4a" : "#777",
              fontWeight: active ? 600 : 400,
              borderBottom: active ? "1px solid rgba(232,255,74,0.4)" : "1px solid transparent",
            }}>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
