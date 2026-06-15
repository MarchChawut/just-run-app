import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activityLogger"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Self-hosted behind a reverse proxy (NAS/custom domain) — trust the forwarded
  // Host header instead of throwing UntrustedHost on sign-in in production.
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  events: {
    createUser: async ({ user }) => {
      void logActivity({ userId: user.id, userEmail: user.email ?? undefined, action: "user_signed_up", detail: { name: user.name } })
    },
  },
})
