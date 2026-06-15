import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Image from "next/image"
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton"

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect("/dashboard")

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center"
      style={{ background: "#07070f" }}
    >
      {/* ── Centered red glow ── */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        <div
          style={{
            width: "600px",
            height: "600px",
            background: "radial-gradient(circle, rgba(210,35,35,0.28) 0%, transparent 65%)",
          }}
        />
      </div>

      {/* ── Runner image — centered background ── */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        aria-hidden="true"
      >
        <Image
          src="/runner-bg.png"
          alt=""
          width={520}
          height={520}
          className="opacity-[0.13]"
          priority
        />
      </div>

      {/* ── Dark vignette edges — keeps card readable ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(7,7,15,0.80) 100%)",
        }}
      />

      {/* ── Login card ── */}
      <div
        className="relative w-full max-w-sm mx-6 rounded-3xl p-8 flex flex-col gap-7"
        style={{
          background: "rgba(7,7,15,0.75)",
          border: "1px solid rgba(232,255,74,0.14)",
          backdropFilter: "blur(32px)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.8), 0 0 80px rgba(210,35,35,0.08)",
        }}
      >
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-20 h-20 rounded-2xl overflow-hidden mb-2"
            style={{ boxShadow: "0 0 24px rgba(210,35,35,0.5), 0 4px 16px rgba(0,0,0,0.6)" }}
          >
            <Image src="/runner-bg.png" alt="ตัวตึง Just Run" width={80} height={80} />
          </div>
          <h1
            className="text-5xl font-black tracking-tighter leading-none"
            style={{ color: "#E8FF4A" }}
          >
            ตัวตึง
          </h1>
          <p
            className="text-xl font-bold tracking-wide"
            style={{ color: "rgba(232,255,74,0.65)" }}
          >
            Just Run! 🏃
          </p>
          <p className="text-xs text-center mt-0.5" style={{ color: "rgba(255,255,255,0.30)" }}>
            วางแผนซ้อมวิ่งด้วยหลักวิทยาศาสตร์การกีฬา
          </p>
        </div>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background:
              "linear-gradient(to right, transparent, rgba(232,255,74,0.20), transparent)",
          }}
        />

        <GoogleSignInButton />

        <p className="text-center text-[10px]" style={{ color: "rgba(255,255,255,0.16)" }}>
          © 2025 ตัวตึง Just Run
        </p>
      </div>
    </div>
  )
}
