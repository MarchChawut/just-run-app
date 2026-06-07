import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ProfileFormDialog } from "@/components/profile/ProfileFormDialog"

const distanceLabels: Record<string, string> = {
  "5k": "5 กม.",
  "10k": "10 กม.",
  half_marathon: "ฮาล์ฟมาราธอน 21 กม.",
  full_marathon: "มาราธอน 42 กม.",
}

const intensityLabels: Record<string, string> = {
  gentle: "ผ่อนคลาย",
  normal: "ปกติ",
  challenging: "ท้าทาย",
  elite: "Elite",
}

const sessionTimeLabels: Record<string, string> = {
  morning: "เช้า",
  evening: "เย็น",
  both: "เช้าและเย็น",
}

const DAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]

export default async function ProfilePage() {
  const session = await auth()
  const userId = session!.user!.id!
  const user = session!.user!

  const profile = await prisma.runnerProfile.findUnique({ where: { userId } })

  let trainingDayNums: number[] = []
  try {
    trainingDayNums = JSON.parse(profile?.trainingDays ?? "[]")
  } catch {}

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">โปรไฟล์นักวิ่ง</h1>
          <p className="text-muted-foreground">ข้อมูลส่วนตัวและโปรไฟล์การวิ่ง</p>
        </div>
        <ProfileFormDialog profile={profile} />
      </div>

      {/* User card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "user"} />
              <AvatarFallback className="text-xl">
                {user.name?.[0]?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {profile ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ข้อมูลการซ้อม</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">เป้าหมาย</p>
                <p className="font-medium">
                  {distanceLabels[profile.targetDistance] ?? profile.targetDistance}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">ความเข้มข้น</p>
                <p className="font-medium">
                  {intensityLabels[profile.intensity] ?? profile.intensity}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">วันซ้อม/สัปดาห์</p>
                <p className="font-medium">{profile.daysPerWeek} วัน</p>
              </div>
              <div>
                <p className="text-muted-foreground">เวลาซ้อม</p>
                <p className="font-medium">
                  {sessionTimeLabels[profile.sessionTime] ?? profile.sessionTime}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">ประเภทพื้น</p>
                <p className="font-medium capitalize">{profile.terrainType}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">วันที่ซ้อม</p>
                <div className="flex gap-1 flex-wrap">
                  {trainingDayNums.length > 0 ? (
                    trainingDayNums.sort().map((d) => (
                      <Badge key={d} variant="secondary" className="text-xs">
                        {DAYS_TH[d]}
                      </Badge>
                    ))
                  ) : (
                    <p className="font-medium text-muted-foreground">ยังไม่ได้ตั้งค่า</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {(profile.pr5k || profile.pr10k || profile.prHalf || profile.prFull) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Record</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: "5K", value: profile.pr5k },
                  { label: "10K", value: profile.pr10k },
                  { label: "ฮาล์ฟ", value: profile.prHalf },
                  { label: "มาราธอน", value: profile.prFull },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label}>
                      <p className="text-muted-foreground">{label}</p>
                      <p className="font-medium font-mono">{value}</p>
                    </div>
                  ) : null
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <p className="text-2xl">🏃</p>
            <p className="font-medium">ยังไม่มีโปรไฟล์นักวิ่ง</p>
            <p className="text-sm text-muted-foreground">
              กรอกข้อมูลเพื่อให้ระบบสร้างแผนซ้อมที่เหมาะกับคุณ
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
