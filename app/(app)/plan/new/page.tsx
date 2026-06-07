import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PlanWizardPage } from "@/components/plan/PlanWizardPage"

export const metadata = { title: "สร้างแผนซ้อมใหม่ · ตัวตึง Just Run!" }

export default async function NewPlanPage() {
  const session = await auth()
  const profile = await prisma.runnerProfile.findUnique({
    where: { userId: session!.user!.id! },
  })
  return <PlanWizardPage profile={profile} />
}
