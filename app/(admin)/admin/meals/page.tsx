import { getMealItems } from "@/app/actions/admin"
import { MealManager } from "@/components/admin/MealManager"

export default async function MealsPage() {
  const result = await getMealItems()
  const items = "success" in result ? result.items : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">เมนูอาหาร</h1>
        <p className="text-sm mt-1" style={{ color: "#666" }}>
          เมนูที่เพิ่มที่นี่จะถูกรวมกับเมนู default — ผู้ใช้จะเห็นเมนูใหม่ในครั้งต่อไปที่เปิดดูแผน
        </p>
      </div>
      <MealManager initialItems={items} />
    </div>
  )
}
