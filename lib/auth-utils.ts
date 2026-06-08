import { auth } from "@/auth"
import { redirect } from "next/navigation"

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  return session
}

export async function getSession() {
  return await auth()
}

export function isAdmin(email?: string | null): boolean {
  if (!email) return false
  const allowed = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase())
  return allowed.includes(email.toLowerCase())
}

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!isAdmin(session.user.email)) redirect("/dashboard")
  return session
}
