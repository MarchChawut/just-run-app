export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#e8ff4a", borderTopColor: "transparent" }}
        />
        <span className="text-sm" style={{ color: "#666" }}>กำลังโหลด...</span>
      </div>
    </div>
  )
}
