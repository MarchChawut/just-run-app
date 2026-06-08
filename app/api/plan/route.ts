import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { trainingPlanSchema } from "@/lib/validations"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const plans = await prisma.trainingPlan.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(plans)
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 503 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = trainingPlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const plan = await prisma.trainingPlan.create({
      data: {
        ...parsed.data,
        userId: session.user.id,
        planData: parsed.data.planData as object,
      },
    })
    return NextResponse.json(plan, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 503 })
  }
}
