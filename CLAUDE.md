# CLAUDE.md — ตัวตึง Just Run! (Fullstack)

> อ่านไฟล์นี้ก่อนทำงานทุกครั้ง  
> โปรเจคนี้คือ **ตัวตึง Just Run!** — web app วางแผนซ้อมวิ่ง  
> Stack: **Next.js 16 · MariaDB 10 (Synology NAS) · Prisma · NextAuth v5 · shadcn/ui · Tailwind CSS**

---

## 1. Project Bootstrap (ทำครั้งแรกครั้งเดียว)

```bash
# 1. สร้างโปรเจค
npx create-next-app@latest tua-tueng-just-run \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*"

cd tua-tueng-just-run

# 2. Dependencies หลัก
npm install \
  prisma @prisma/client \
  next-auth@beta \                  # NextAuth v5 (Auth.js)
  @auth/prisma-adapter \
  zod \
  @tanstack/react-query \
  zustand

# 3. Dev dependencies
npm install -D \
  @types/node

# 4. shadcn/ui init
npx shadcn@latest init
# เลือก: Default style, Slate base color, CSS variables = yes

# 5. shadcn components ที่ต้องใช้
npx shadcn@latest add button card input label \
  form dialog sheet tabs badge avatar \
  dropdown-menu separator skeleton toast \
  progress calendar

# 6. Prisma init
npx prisma init --datasource-provider mysql
```

---

## 2. โครงสร้าง Directory

```
tua-tueng-just-run/
├── CLAUDE.md                    ← ไฟล์นี้
├── .env                         ← ⛔ ไม่ commit เด็ดขาด
├── .env.example                 ← ✅ commit ได้ (ไม่มีค่าจริง)
├── .gitignore                   ← ต้อง include .env ทุกรูปแบบ
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             ← redirect → /dashboard หรือ /login
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx     ← Google Sign-In page
│   │   ├── (app)/               ← Route group: ต้อง login ก่อน
│   │   │   ├── layout.tsx       ← ตรวจ session, redirect ถ้าไม่ได้ login
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── plan/
│   │   │   │   ├── page.tsx     ← รายการแผนซ้อมทั้งหมด
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx ← รายละเอียดแผน
│   │   │   └── profile/
│   │   │       └── page.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts ← NextAuth handler
│   │       └── plan/
│   │           └── route.ts
│   ├── auth.ts                  ← NextAuth config (export { auth, handlers, signIn, signOut })
│   ├── components/
│   │   ├── ui/                  ← shadcn auto-generated
│   │   ├── auth/
│   │   │   └── GoogleSignInButton.tsx
│   │   ├── plan/
│   │   │   ├── PlanCard.tsx
│   │   │   └── TrainingCalendar.tsx
│   │   └── layout/
│   │       ├── Navbar.tsx
│   │       └── Sidebar.tsx
│   ├── lib/
│   │   ├── prisma.ts            ← Prisma client singleton
│   │   ├── auth-utils.ts        ← helper functions
│   │   └── validations.ts       ← Zod schemas
│   └── types/
│       └── index.ts
├── public/
└── next.config.ts
```

---

## 3. Environment Variables

### `.env` (ห้าม commit เด็ดขาด — local only)
```env
# Database — MariaDB บน Synology NAS
DATABASE_URL="mysql://USERNAME:PASSWORD@NAS_IP:3306/tua_tueng_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### `.env.example` (commit ได้ — template เท่านั้น)
```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

### `.env.production` (สำหรับ production server — ห้าม commit)
```env
NEXTAUTH_URL="https://your-domain.com"
# ค่าอื่นเหมือน .env แต่ใช้ production values
```

---

## 4. .gitignore (สำคัญมาก — ห้าม commit secrets)

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Next.js build output
.next/
out/
build/

# ⛔ Environment files — ห้าม commit เด็ดขาด
.env
.env.*
!.env.example        # ← exception: .env.example commit ได้
*.local

# Prisma
prisma/migrations/   # อาจ commit ได้ถ้าต้องการ track migrations

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Misc
.vercel
*.tsbuildinfo
next-env.d.ts
```

---

## 5. Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ─── NextAuth required tables ───
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  plans         TrainingPlan[]
  profile       RunnerProfile?
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ─── App-specific tables ───
model RunnerProfile {
  id               String    @id @default(cuid())
  userId           String    @unique
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  age              Int?
  targetDistance   String    // "5k" | "half_marathon" | "full_marathon" | etc.
  daysPerWeek      Int       @default(4)
  trainingDays     String    // JSON array [1,3,4,6]
  longRunDay       Int       @default(6)
  sessionTime      String    @default("evening")  // "morning" | "evening" | "both"
  morningMinutes   Int?
  morningZone2     Boolean   @default(false)
  eveningMinutes   Int?
  intensity        String    @default("normal")  // "gentle"|"normal"|"challenging"|"elite"
  terrainType      String    @default("road")
  conditions       String    @default("[]")  // JSON array
  shoes            String    @default("[]")  // JSON array

  pr5k             String?
  pr10k            String?
  prHalf           String?
  prFull           String?

  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  plans            TrainingPlan[]
}

model TrainingPlan {
  id               String    @id @default(cuid())
  userId           String
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  profileId        String?
  profile          RunnerProfile? @relation(fields: [profileId], references: [id])

  name             String    @default("แผนซ้อมวิ่ง")
  targetDistance   String
  startDate        DateTime
  raceDate         DateTime
  trainingWeeks    Int
  projectedTime    String?
  planData         Json      // เก็บ weeks[] ทั้งหมด
  isActive         Boolean   @default(true)

  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([userId])
}
```

---

## 6. NextAuth Config (`src/auth.ts`)

```typescript
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
})
```

---

## 7. Prisma Client Singleton (`src/lib/prisma.ts`)

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

---

## 8. Route Handler NextAuth (`src/app/api/auth/[...nextauth]/route.ts`)

```typescript
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

---

## 9. Protected Layout (`src/app/(app)/layout.tsx`)

```typescript
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar พร้อม user avatar + signOut */}
      {children}
    </div>
  )
}
```

---

## 10. Login Page (`src/app/(auth)/login/page.tsx`)

```typescript
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton"

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect("/dashboard")

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6">
        {/* Logo + App name */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">ตัวตึง</h1>
          <p className="text-xl text-muted-foreground">Just Run! 🏃</p>
          <p className="text-sm text-muted-foreground">
            วางแผนซ้อมวิ่งด้วยหลักวิทยาศาสตร์การกีฬา
          </p>
        </div>
        <GoogleSignInButton />
      </div>
    </div>
  )
}
```

---

## 11. Google Sign-In Button (`src/components/auth/GoogleSignInButton.tsx`)

```typescript
"use client"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function GoogleSignInButton() {
  return (
    <Button
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      variant="outline"
      size="lg"
      className="w-full gap-3"
    >
      {/* Google SVG icon */}
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      เข้าสู่ระบบด้วย Google
    </Button>
  )
}
```

---

## 12. GitHub Setup

### ขั้นตอน init และ push

```bash
# 1. สร้าง repo ใหม่บน GitHub (ผ่าน gh CLI หรือเว็บ)
gh repo create tua-tueng-just-run \
  --private \           # ← private repo เพื่อความปลอดภัย
  --description "ตัวตึง Just Run! — Running Training Plan App" \
  --source=. \
  --remote=origin \
  --push

# หรือ manual:
git init
git add .
git commit -m "feat: initial project setup"
git branch -M main
git remote add origin git@github.com:MarchChawut/tua-tueng-just-run.git
git push -u origin main
```

### Branch Strategy

```
main          ← production-ready เท่านั้น
develop       ← integration branch
feat/*        ← feature branches
fix/*         ← bug fixes
```

### GitHub Actions (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
```

### GitHub Secrets (Settings → Secrets → Actions)

ตั้งค่า secrets เหล่านี้ใน GitHub repo — **ไม่เคย hardcode ในโค้ด:**

| Secret Name | ค่า |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `NEXTAUTH_SECRET` | random 32-byte base64 |
| `NEXTAUTH_URL` | production URL |
| `GOOGLE_CLIENT_ID` | จาก Google Console |
| `GOOGLE_CLIENT_SECRET` | จาก Google Console |

---

## 13. Security Checklist

### ก่อน git push ทุกครั้ง ต้องตรวจ:

```bash
# ตรวจว่าไม่มี secrets หลุดไปใน staged files
git diff --cached | grep -iE "(password|secret|key|token|DATABASE_URL)" && echo "⛔ STOP! secrets detected" || echo "✅ clean"

# ตรวจ .gitignore ครอบคลุม .env หรือยัง
git check-ignore -v .env .env.local .env.production
```

### ป้องกัน secrets ด้วย pre-commit hook

```bash
# สร้าง .git/hooks/pre-commit
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
if git diff --cached | grep -qiE "(NEXTAUTH_SECRET|GOOGLE_CLIENT_SECRET|DATABASE_URL.*@)"; then
  echo "⛔ ERROR: Possible secret detected in commit. Aborting."
  echo "   ตรวจสอบไฟล์ .env ว่าไม่ได้ stage ไว้"
  exit 1
fi
EOF
chmod +x .git/hooks/pre-commit
```

### กฎเหล็ก

- ✅ `.env.example` — commit ได้ (ไม่มีค่าจริง)
- ⛔ `.env` — ห้าม commit เด็ดขาด
- ⛔ `.env.local` — ห้าม commit เด็ดขาด
- ⛔ `.env.production` — ห้าม commit เด็ดขาด
- ⛔ hardcode passwords/secrets ในโค้ดทุกรูปแบบ

---

## 14. MariaDB บน Synology NAS

```bash
# ทดสอบการเชื่อมต่อ
npx prisma db push        # สร้าง/อัปเดต tables ตาม schema
npx prisma studio         # เปิด GUI จัดการ DB (localhost:5555)
npx prisma migrate dev    # สร้าง migration files (production)
```

### Connection requirements (Synology MariaDB 10)

```
Host: NAS local IP (เช่น 192.168.1.100) หรือ domain
Port: 3306 (default)
User: ต้องให้ grant privileges ใน phpMyAdmin ก่อน
SSL: optional แต่แนะนำสำหรับ production
```

### `next.config.ts` (whitelist external image domain สำหรับ Google avatar)

```typescript
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",  // Google profile pictures
      },
    ],
  },
}

export default nextConfig
```

---

## 15. Google OAuth Setup

1. ไปที่ [console.cloud.google.com](https://console.cloud.google.com)
2. สร้าง Project ใหม่ → **APIs & Services → OAuth consent screen**
3. **Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://your-domain.com/api/auth/callback/google` (prod)
6. Copy **Client ID** และ **Client Secret** ใส่ `.env`

---

## 16. คำสั่งที่ใช้บ่อย

```bash
# Dev
npm run dev

# Build
npm run build
npm start

# Database
npx prisma generate           # generate Prisma client หลังแก้ schema
npx prisma db push            # push schema → DB (no migration file)
npx prisma migrate dev        # create migration + push
npx prisma migrate deploy     # deploy migrations (production)
npx prisma studio             # open DB GUI

# Git
git status
git add .
git commit -m "feat: ..."
git push origin main

# Check secrets before push
git diff --cached | grep -iE "secret|password|DATABASE_URL"
```

---

## 17. Next Steps หลังติดตั้ง

ลำดับการ build features:

1. **[ ] Auth** — Google Sign-In → session → protected routes ✓ (spec นี้)
2. **[ ] Wizard** — port จาก HTML prototype → Next.js pages
3. **[ ] Plan Generator** — port trainingEngine.ts → server action
4. **[ ] Calendar View** — interactive calendar แสดง plan
5. **[ ] Plan Storage** — save/load plans จาก MariaDB
6. **[ ] Dashboard** — สรุป km รายสัปดาห์/เดือน
7. **[ ] Profile** — จัดการข้อมูลนักวิ่ง

---

## 18. Notes สำหรับ Claude Code

- อ่าน `CLAUDE.md` ก่อนทำงานทุกครั้ง
- ใช้ **App Router** เท่านั้น (ไม่ใช้ Pages Router)
- ใช้ **Server Components** เป็น default — เพิ่ม `'use client'` เฉพาะเมื่อจำเป็น
- **params และ searchParams ต้อง await** (Next.js 15+)
- **middleware** ใน Next.js 16 ใช้ `proxy.ts` + export `proxy()` + `proxyConfig`
- ทุก API route ต้องตรวจ session ก่อน return data
- ใช้ **Zod** validate input ทุก server action และ API route
- ใช้ **shadcn/ui** components — ไม่สร้าง UI จาก scratch
- สี theme: dark mode เป็น default ตาม design ของแอป (สีเหลือง neon #E8FF4A)
