"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { upsertProfile } from "@/app/actions/profile"
import type { RunnerProfile } from "@prisma/client"

const DAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]

type Props = {
  profile: RunnerProfile | null
}

export function ProfileFormDialog({ profile }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const [selectedDays, setSelectedDays] = useState<number[]>(() => {
    try {
      return JSON.parse(profile?.trainingDays ?? "[]")
    } catch {
      return []
    }
  })

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const formData = new FormData(e.currentTarget)
    formData.set("trainingDays", JSON.stringify(selectedDays))

    startTransition(async () => {
      const result = await upsertProfile(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  const isEditing = !!profile

  return (
    <>
      <Button onClick={() => setOpen(true)} variant={isEditing ? "outline" : "default"}>
        {isEditing ? "แก้ไขโปรไฟล์" : "สร้างโปรไฟล์นักวิ่ง"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "แก้ไขโปรไฟล์นักวิ่ง" : "สร้างโปรไฟล์นักวิ่ง"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            {/* ─── เป้าหมายการวิ่ง ─── */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                เป้าหมาย
              </legend>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="targetDistance">ระยะทางเป้าหมาย</Label>
                  <select
                    id="targetDistance"
                    name="targetDistance"
                    required
                    defaultValue={profile?.targetDistance ?? ""}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- เลือก --</option>
                    <option value="5k">5 กม.</option>
                    <option value="10k">10 กม.</option>
                    <option value="half_marathon">ฮาล์ฟมาราธอน</option>
                    <option value="full_marathon">มาราธอน</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="intensity">ความเข้มข้น</Label>
                  <select
                    id="intensity"
                    name="intensity"
                    defaultValue={profile?.intensity ?? "normal"}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="gentle">ผ่อนคลาย</option>
                    <option value="normal">ปกติ</option>
                    <option value="challenging">ท้าทาย</option>
                    <option value="elite">Elite</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* ─── ตารางซ้อม ─── */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                ตารางซ้อม
              </legend>

              <div className="space-y-1.5">
                <Label>วันที่ซ้อม (เลือกได้หลายวัน)</Label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_TH.map((day, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`w-9 h-9 rounded-full text-xs font-medium border transition-colors ${
                        selectedDays.includes(i)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="daysPerWeek">วันซ้อม/สัปดาห์</Label>
                  <Input
                    id="daysPerWeek"
                    name="daysPerWeek"
                    type="number"
                    min={2}
                    max={7}
                    defaultValue={profile?.daysPerWeek ?? 4}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="terrainType">ประเภทพื้น</Label>
                  <select
                    id="terrainType"
                    name="terrainType"
                    defaultValue={profile?.terrainType ?? "road"}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="road">Road</option>
                    <option value="trail">Trail</option>
                    <option value="track">Track</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sessionTime">เวลาซ้อม</Label>
                <select
                  id="sessionTime"
                  name="sessionTime"
                  defaultValue={profile?.sessionTime ?? "evening"}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="morning">เช้า</option>
                  <option value="evening">เย็น</option>
                  <option value="both">เช้าและเย็น</option>
                </select>
              </div>
            </fieldset>

            {/* ─── Personal Record ─── */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Personal Record (ไม่บังคับ)
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "pr5k", label: "5K", placeholder: "เช่น 25:30" },
                  { id: "pr10k", label: "10K", placeholder: "เช่น 55:00" },
                  { id: "prHalf", label: "ฮาล์ฟ", placeholder: "เช่น 2:05:00" },
                  { id: "prFull", label: "มาราธอน", placeholder: "เช่น 4:30:00" },
                ].map(({ id, label, placeholder }) => (
                  <div key={id} className="space-y-1.5">
                    <Label htmlFor={id}>{label}</Label>
                    <Input
                      id={id}
                      name={id}
                      placeholder={placeholder}
                      defaultValue={(profile as Record<string, unknown>)?.[id] as string ?? ""}
                    />
                  </div>
                ))}
              </div>
            </fieldset>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
