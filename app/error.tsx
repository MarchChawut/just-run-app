"use client"

import { useEffect } from "react"

export default function GlobalError({
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 px-6 max-w-sm">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-xl font-bold text-white">เกิดข้อผิดพลาด</h1>
        <p className="text-sm" style={{ color: "#888" }}>
          {error.digest ? `Error ID: ${error.digest}` : "กรุณาลองใหม่อีกครั้ง"}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "#e8ff4a", color: "#0a0a0f" }}
        >
          ลองใหม่
        </button>
      </div>
    </div>
  )
}
