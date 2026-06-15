"use client"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { SessionUser } from "@/types"

type NavbarProps = {
  user: SessionUser
  isAdmin?: boolean
}

export function Navbar({ user, isAdmin }: NavbarProps) {
  return (
    <header className="border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold" style={{ color: "#E8FF4A" }}>
            ตัวตึง - Just Run!
          </span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "user"} />
              <AvatarFallback>{user.name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/profile" className="w-full">โปรไฟล์</Link>
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/admin" className="w-full flex items-center gap-2">
                    <span>⚙️</span> Admin Dashboard
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
