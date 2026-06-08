"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveMealItem, deleteMealItem, toggleMealItem } from "@/app/actions/admin"

type MealItem = {
  id: string; category: string; slot: string
  name: string; note: string | null; isActive: boolean; sortOrder: number
}

type Category = "rest" | "easy" | "long" | "hard" | "moderate"
type Slot = "breakfast" | "lunch" | "snack" | "dinner"

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  rest:     { label: "Rest / Recovery", color: "#4a9fff" },
  easy:     { label: "Easy Run",        color: "#4af0ff" },
  long:     { label: "Long Run",        color: "#e8ff4a" },
  hard:     { label: "Hard (Tempo/Interval)", color: "#ff4a4a" },
  moderate: { label: "Moderate (Hills/Fartlek)", color: "#ff9f4a" },
}
const SLOT_LABELS: Record<string, string> = {
  breakfast: "🌅 เช้า", lunch: "🌞 กลางวัน", snack: "🍎 Snack", dinner: "🌙 เย็น",
}
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[]
const SLOTS = Object.keys(SLOT_LABELS) as Slot[]

const initForm = (): { category: Category; slot: Slot; name: string; note: string } =>
  ({ category: "easy", slot: "breakfast", name: "", note: "" })

const SelectField = ({ label, value, options, onChange }: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) => (
  <div className="space-y-1">
    <label className="text-xs font-medium" style={{ color: "#777" }}>{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 rounded-lg px-3 text-sm"
      style={{
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
        color: "#ddd", appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
        paddingRight: "28px",
      }}>
      {options.map((o) => <option key={o.value} value={o.value} style={{ background: "#1a1a24" }}>{o.label}</option>)}
    </select>
  </div>
)

export function MealManager({ initialItems }: { initialItems: MealItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState<MealItem[]>(initialItems)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState(initForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string>("all")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const flash = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(""), 2500)
  }

  const filtered = filterCat === "all" ? items : items.filter((i) => i.category === filterCat)

  const startEdit = (item: MealItem) => {
    setEditId(item.id)
    setForm({ category: item.category as Category, slot: item.slot as Slot, name: item.name, note: item.note ?? "" })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const cancelEdit = () => { setEditId(null); setForm(initForm()); setError("") }

  const handleSave = () => {
    if (!form.name.trim()) { setError("กรุณาใส่ชื่อเมนู"); return }
    setError("")
    startTransition(async () => {
      const data = { ...form, isActive: true, sortOrder: 0, note: form.note || undefined }
      const res = await saveMealItem(editId, data)
      if ("error" in res) { setError(res.error ?? "เกิดข้อผิดพลาด"); return }

      if (editId) {
        setItems((prev) => prev.map((i) => i.id === editId
          ? { ...i, ...form, id: editId, note: form.note || null } : i))
        flash("แก้ไขเมนูแล้ว")
      } else {
        // Refresh to get the new item's real ID from server
        router.refresh()
        flash("เพิ่มเมนูแล้ว")
      }
      cancelEdit()
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`ลบ "${name}"?`)) return
    startTransition(async () => {
      await deleteMealItem(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
      flash("ลบแล้ว")
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
      {/* ── Add / Edit form ─────────────────────────────────────── */}
      <div className="rounded-2xl p-6 space-y-5"
        style={{ background: "rgba(74,240,255,0.03)", border: `1px solid ${editId ? "rgba(232,255,74,0.3)" : "rgba(74,240,255,0.15)"}` }}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">
            {editId ? "✏️ แก้ไขเมนู" : "➕ เพิ่มเมนูใหม่"}
          </h2>
          {editId && (
            <button onClick={cancelEdit} className="text-xs px-3 py-1 rounded-lg"
              style={{ background: "rgba(255,255,255,0.06)", color: "#888" }}>✕ ยกเลิก</button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="ประเภทการวิ่ง"
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v as Category }))}
            options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c].label }))}
          />
          <SelectField
            label="มื้ออาหาร"
            value={form.slot}
            onChange={(v) => setForm((f) => ({ ...f, slot: v as Slot }))}
            options={SLOTS.map((s) => ({ value: s, label: SLOT_LABELS[s] }))}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: "#777" }}>ชื่อเมนู <span style={{ color: "#ff4a4a" }}>*</span></label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="เช่น ข้าวต้มหมูสับ + ไข่ต้ม"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="w-full h-10 rounded-xl px-4 text-sm"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: "#777" }}>หมายเหตุ / เหตุผลทางโภชนาการ</label>
          <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="เช่น โปรตีนสูง ย่อยง่าย เหมาะหลังวิ่ง"
            className="w-full h-10 rounded-xl px-4 text-sm"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button onClick={handleSave} disabled={isPending}
            className="px-6 py-2.5 rounded-xl text-sm font-bold transition-opacity"
            style={{ background: "#e8ff4a", color: "#0a0a0f", opacity: isPending ? 0.6 : 1 }}>
            {isPending ? "⏳ กำลังบันทึก..." : (editId ? "💾 บันทึกการแก้ไข" : "✅ เพิ่มเมนู")}
          </button>
          {error && <span className="text-sm" style={{ color: "#ff4a4a" }}>{error}</span>}
          {success && <span className="text-sm" style={{ color: "#4aff8c" }}>✓ {success}</span>}
        </div>
      </div>

      {/* ── Category filter chips ─────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat("all")}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
          style={{ background: filterCat === "all" ? "#e8ff4a" : "rgba(255,255,255,0.06)", color: filterCat === "all" ? "#0a0a0f" : "#888" }}>
          ทั้งหมด <span style={{ opacity: 0.6 }}>({items.length})</span>
        </button>
        {CATEGORIES.map((c) => {
          const count = items.filter((i) => i.category === c).length
          const active = filterCat === c
          return (
            <button key={c} onClick={() => setFilterCat(c)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: active ? `${CATEGORY_LABELS[c].color}22` : "rgba(255,255,255,0.04)",
                color: active ? CATEGORY_LABELS[c].color : "#666",
                border: `1px solid ${active ? CATEGORY_LABELS[c].color + "44" : "transparent"}`,
              }}>
              {CATEGORY_LABELS[c].label} <span style={{ opacity: 0.6 }}>({count})</span>
            </button>
          )
        })}
      </div>

      {/* ── Meal list ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
          <div className="text-4xl mb-3">🍽️</div>
          <p className="text-sm" style={{ color: "#555" }}>ยังไม่มีเมนูในหมวดนี้</p>
          <p className="text-xs mt-1" style={{ color: "#444" }}>เพิ่มจากฟอร์มด้านบน</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const catInfo = CATEGORY_LABELS[item.category]
            return (
              <div key={item.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-opacity"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${editId === item.id ? "rgba(232,255,74,0.3)" : "rgba(255,255,255,0.07)"}`,
                  opacity: item.isActive ? 1 : 0.4,
                }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${catInfo?.color ?? "#888"}18`, color: catInfo?.color ?? "#888", border: `1px solid ${catInfo?.color ?? "#888"}30` }}>
                      {catInfo?.label ?? item.category}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(74,240,255,0.1)", color: "#4af0ff" }}>
                      {SLOT_LABELS[item.slot] ?? item.slot}
                    </span>
                    <span className="text-sm font-medium text-white">{item.name}</span>
                  </div>
                  {item.note && (
                    <p className="text-xs mt-1" style={{ color: "#555" }}>{item.note}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleToggle(item.id, item.isActive)}
                    className="text-[11px] px-2.5 py-1 rounded-lg transition-all"
                    style={{
                      background: item.isActive ? "rgba(74,255,140,0.1)" : "rgba(255,255,255,0.05)",
                      color: item.isActive ? "#4aff8c" : "#555",
                      border: `1px solid ${item.isActive ? "rgba(74,255,140,0.2)" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    {item.isActive ? "เปิด" : "ปิด"}
                  </button>
                  <button onClick={() => startEdit(item)}
                    className="text-[11px] px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#888" }}>
                    แก้ไข
                  </button>
                  <button onClick={() => handleDelete(item.id, item.name)}
                    className="text-[11px] px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(255,74,74,0.08)", color: "#ff4a4a", border: "1px solid rgba(255,74,74,0.15)" }}>
                    ลบ
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
