"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
      <div className="text-5xl">⚠️</div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-white">โหลดหน้านี้ไม่ได้</h2>
        <p className="text-sm" style={{ color: "#888" }}>
          {error.digest ? `Error ID: ${error.digest}` : "กรุณาลองใหม่ หรือกลับหน้าหลัก"}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "#e8ff4a", color: "#0a0a0f" }}
        >
          ลองใหม่
        </button>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(255,255,255,0.08)", color: "#ccc" }}
        >
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  )
}
