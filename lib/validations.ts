import { z } from "zod"

export const TARGET_DISTANCE_VALUES = [
  "3k_beginner",
  "5k",
  "mini_marathon",
  "half_marathon",
  "full_marathon",
  "ultra_50",
  "ultra_100",
  "trail_15",
  "trail_20",
  "trail_30",
  "trail_40",
  "trail_50",
] as const

export const EXPERIENCE_LEVEL_VALUES = ["beginner", "intermediate", "advanced"] as const

export const runnerProfileSchema = z.object({
  age: z.number().int().min(10).max(100).optional(),
  targetDistance: z.enum(TARGET_DISTANCE_VALUES),
  level: z.enum(EXPERIENCE_LEVEL_VALUES).default("beginner"),
  daysPerWeek: z.number().int().min(2).max(7).default(4),
  trainingDays: z.array(z.number().int().min(0).max(6)),
  longRunDay: z.number().int().min(0).max(6).default(6),
  sessionTime: z.enum(["morning", "evening", "both"]).default("evening"),
  morningMinutes: z.number().int().min(20).max(180).optional(),
  morningZone2: z.boolean().default(false),
  eveningMinutes: z.number().int().min(20).max(180).optional(),
  intensity: z.enum(["gentle", "normal", "challenging", "elite"]).default("normal"),
  terrainType: z.enum(["road", "trail", "track", "mixed"]).default("road"),
  conditions: z.array(z.string()).default([]),
  shoes: z.array(z.string()).default([]),
  elevationGain: z.number().int().min(0).max(15000).optional(),
  pr5k: z.string().optional(),
  pr10k: z.string().optional(),
  prHalf: z.string().optional(),
  prFull: z.string().optional(),
})

export const trainingPlanSchema = z.object({
  name: z.string().min(1).max(100).default("แผนซ้อมวิ่ง"),
  targetDistance: z.enum(TARGET_DISTANCE_VALUES),
  startDate: z.date(),
  raceDate: z.date(),
  trainingWeeks: z.number().int().min(4).max(36),
  projectedTime: z.string().optional(),
  planData: z.record(z.string(), z.unknown()),
  isActive: z.boolean().default(true),
})

export const createPlanWizardSchema = z.object({
  name: z.string().min(1).max(100),
  targetDistance: z.enum(TARGET_DISTANCE_VALUES),
  level: z.enum(EXPERIENCE_LEVEL_VALUES).default("beginner"),
  trainingGoal: z.enum(["performance", "endurance"]).default("performance"),
  startDate: z.string().min(1),
  raceDate: z.string().min(1),
  trainingWeeks: z.number().int().min(4).max(36),
  daysPerWeek: z.number().int().min(3).max(6),
  trainingDays: z.array(z.number().int().min(0).max(6)),
  longRunDay: z.number().int().min(0).max(6),
  sessionTime: z.enum(["morning", "evening", "both"]),
  morningZone2: z.boolean().default(false),
  morningMinutes: z.number().int().min(15).max(180).default(45),
  eveningMinutes: z.number().int().min(15).max(180).default(45),
  intensity: z.enum(["gentle", "normal", "challenging", "elite"]),
  terrainType: z.enum(["road", "trail", "track", "mixed"]),
  runMode: z.enum(["outdoor", "treadmill"]).default("outdoor"),
  elevationGain: z.number().int().min(0).max(15000).optional(),
  pr5k: z.string().optional(),
  pr10k: z.string().optional(),
  prHalf: z.string().optional(),
  prFull: z.string().optional(),
})

export type RunnerProfileInput = z.infer<typeof runnerProfileSchema>
export type TrainingPlanInput = z.infer<typeof trainingPlanSchema>
export type CreatePlanWizardInput = z.infer<typeof createPlanWizardSchema>
