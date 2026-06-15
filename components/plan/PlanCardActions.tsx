"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updatePlan, deletePlan } from "@/app/actions/plan"

type Props = {
  planId: string
  planName: string
  isActive: boolean
}

export function PlanCardActions({ planId, planName, isActive }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [nameValue, setNameValue] = useState(planName)
  const [activeValue, setActiveValue] = useState(isActive)
  const [error, setError] = useState("")

  const handleEdit = () => {
    setError("")
    startTransition(async () => {
      const result = await updatePlan(planId, { name: nameValue, isActive: activeValue })
      if ("error" in result) {
        setError(result.error ?? "เกิดข้อผิดพลาด")
      } else {
        setShowEdit(false)
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deletePlan(planId)
      setShowDelete(false)
      router.refresh()
    })
  }

  return (
    <>
      {/* Three-dot menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="w-8 h-8 rounded-full flex items-center justify-center outline-none transition-colors hover:bg-white/10"
          style={{ color: "#888", flexShrink: 0 }}
        >
          <span className="text-lg leading-none">⋯</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => { setNameValue(planName); setActiveValue(isActive); setShowEdit(true) }}>
            ✏️ แก้ไข
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setShowDelete(true)}
          >
            🗑️ ลบแผน
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ─── Edit dialog ─── */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>แก้ไขแผนซ้อม</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">ชื่อแผน</Label>
              <Input
                id="plan-name"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveValue(!activeValue)}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ background: activeValue ? "#e8ff4a" : "rgba(255,255,255,0.15)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                  style={{
                    background: activeValue ? "#0a0a0f" : "#888",
                    transform: activeValue ? "translateX(22px)" : "translateX(2px)",
                  }}
                />
              </button>
              <Label className="cursor-pointer" onClick={() => setActiveValue(!activeValue)}>
                {activeValue ? "ใช้งานอยู่ (Active)" : "ปิดใช้งาน"}
              </Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEdit(false)} disabled={isPending}>
              ยกเลิก
            </Button>
            <Button onClick={handleEdit} disabled={isPending || !nameValue.trim()}>
              {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete confirm dialog ─── */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ลบแผนซ้อม</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            ต้องการลบ <span className="font-semibold text-foreground">&quot;{planName}&quot;</span> ใช่ไหม?
            การลบจะลบข้อมูลการบันทึกการวิ่งทั้งหมดในแผนนี้ด้วย และไม่สามารถกู้คืนได้
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDelete(false)} disabled={isPending}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isPending}
              style={{ background: "#ff4a4a", color: "#fff" }}
            >
              {isPending ? "กำลังลบ..." : "ลบแผน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
