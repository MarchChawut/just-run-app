"use client"

import { useState, useTransition } from "react"
import { saveMealItem, deleteMealItem, toggleMealItem } from "@/app/actions/admin"

type MealItem = {
  id: string; category: string; slot: string; name: string; note: string | null; isActive: boolean; sortOrder: number
}

const CATEGORY_LABELS: Record<string, string> = {
  rest: "😴 Rest/Recovery", easy: "🏃 Easy Run", long: "🌄 Long Run",
  hard: "🔥 Hard (Tempo/Interval)", moderate: "💪 Moderate (Hills/Fartlek)",
}
const SLOT_LABELS: Record<string, string> = {
  breakfast: "🌅 เช้า", lunch: "🌞 กลางวัน", snack: "🍎 Snack", dinner: "🌙 เย็น",
}
const CATEGORIES = Object.keys(CATEGORY_LABELS)
const SLOTS = Object.keys(SLOT_LABELS)

const emptyForm: { category: "rest"|"easy"|"long"|"hard"|"moderate"; slot: "breakfast"|"lunch"|"snack"|"dinner"; name: string; note: string; isActive: boolean; sortOrder: number } = { category: "easy", slot: "breakfast", name: "", note: "", isActive: true, sortOrder: 0 }

export function MealManager({ initialItems }: { initialItems: MealItem[] }) {
  const [items, setItems] = useState<MealItem[]>(initialItems)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string>("all")
  const [error, setError] = useState("")

  const filtered = filterCat === "all" ? items : items.filter((i) => i.category === filterCat)

  const startEdit = (item: MealItem) => {
    setEditId(item.id)
    setForm({ category: item.category as typeof emptyForm["category"], slot: item.slot as typeof emptyForm["slot"], name: item.name, note: item.note ?? "", isActive: item.isActive, sortOrder: item.sortOrder })
  }

  const cancelEdit = () => { setEditId(null); setForm(emptyForm); setError("") }

  const handleSave = () => {
    if (!form.name.trim()) { setError("กรุณาใส่ชื่อเมนู"); return }
    setError("")
    startTransition(async () => {
      const res = await saveMealItem(editId, { ...form, isActive: form.isActive ?? true, sortOrder: form.sortOrder ?? 0 })
      if ("error" in res) { setError(res.error ?? "เกิดข้อผิดพลาด"); return }
      // Optimistic update
      if (editId) {
        setItems((prev) => prev.map((i) => i.id === editId ? { ...i, ...form, id: editId, note: form.note || null } : i))
      } else {
        // Re-fetch by page refresh (simpler than local optimistic add without id)
        window.location.reload()
      }
      cancelEdit()
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`ลบ "${name}"?`)) return
    startTransition(async () => {
      await deleteMealItem(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    })
  }

  const handleToggle = (id: string, current: boolean) => {
    startTransition(async () => {
      await toggleMealItem(id, !current)
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, isActive: !current } : i))
    })
  }

  return (
    <div className="space-y-6">
      {/* Add / Edit form */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: "rgba(74,240,255,0.04)", border: "1px solid rgba(74,240,255,0.15)" }}>
        <h2 className="font-semibold text-white">{editId ? "✏️ แก้ไขเมนู" : "➕ เพิ่มเมนูใหม่"}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs" style={{ color: "#888" }}>ประเภทการวิ่ง</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as typeof emptyForm["category"] }))}
              className="w-full h-9 rounded-lg px-2 text-sm" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs" style={{ color: "#888" }}>มื้อ</label>
            <select value={form.slot} onChange={(e) => setForm((f) => ({ ...f, slot: e.target.value as typeof emptyForm["slot"] }))}
              className="w-full h-9 rounded-lg px-2 text-sm" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}>
              {SLOTS.map((s) => <option key={s} value={s}>{SLOT_LABELS[s]}</option>)}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs" style={{ color: "#888" }}>ชื่อเมนู *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="เช่น ข้าวต้มหมูสับ + ไข่ต้ม"
              className="w-full h-9 rounded-lg px-3 text-sm" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <label className="text-xs" style={{ color: "#888" }}>หมายเหตุ / เหตุผลทางโภชนาการ</label>
            <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="เช่น โปรตีนสูง ย่อยง่าย เหมาะหลังวิ่ง"
              className="w-full h-9 rounded-lg px-3 text-sm" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs" style={{ color: "#888" }}>Sort order</label>
            <input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
              className="w-full h-9 rounded-lg px-3 text-sm font-mono" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
            />
          </div>
        </div>
        {error && <p className="text-xs" style={{ color: "#ff4a4a" }}>{error}</p>}
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={isPending}
            className="px-5 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "#e8ff4a", color: "#0a0a0f", opacity: isPending ? 0.6 : 1 }}>
            {isPending ? "บันทึก..." : (editId ? "บันทึกการแก้ไข" : "เพิ่มเมนู")}
          </button>
          {editId && (
            <button onClick={cancelEdit} className="px-4 py-2 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "#888" }}>
              ยกเลิก
            </button>
          )}
        </div>
      </div>

      {/* Filter + table */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterCat("all")}
            className="px-3 py-1 rounded-full text-xs"
            style={{ background: filterCat === "all" ? "#e8ff4a" : "rgba(255,255,255,0.06)", color: filterCat === "all" ? "#0a0a0f" : "#888" }}>
            ทั้งหมด ({items.length})
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setFilterCat(c)}
              className="px-3 py-1 rounded-full text-xs"
              style={{ background: filterCat === c ? "#e8ff4a" : "rgba(255,255,255,0.06)", color: filterCat === c ? "#0a0a0f" : "#888" }}>
              {CATEGORY_LABELS[c].split(" ")[0]} {c} ({items.filter((i) => i.category === c).length})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: "#555" }}>ยังไม่มีเมนู — เพิ่มจากฟอร์มด้านบน</p>
        ) : (
          <div className="space-y-1">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", opacity: item.isActive ? 1 : 0.45 }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.06)", color: "#888" }}>{item.category}</span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(74,240,255,0.1)", color: "#4af0ff" }}>{SLOT_LABELS[item.slot] ?? item.slot}</span>
                    <span className="text-sm text-white">{item.name}</span>
                  </div>
                  {item.note && <p className="text-xs mt-0.5" style={{ color: "#666" }}>{item.note}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleToggle(item.id, item.isActive)}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: item.isActive ? "rgba(74,255,140,0.1)" : "rgba(255,255,255,0.06)", color: item.isActive ? "#4aff8c" : "#555" }}>
                    {item.isActive ? "เปิด" : "ปิด"}
                  </button>
                  <button onClick={() => startEdit(item)}
                    className="text-xs px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#888" }}>✏️</button>
                  <button onClick={() => handleDelete(item.id, item.name)}
                    className="text-xs px-2 py-1 rounded" style={{ background: "rgba(255,74,74,0.1)", color: "#ff4a4a" }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
