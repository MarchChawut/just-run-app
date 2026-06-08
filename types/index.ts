import type { User, RunnerProfile, TrainingPlan } from "@prisma/client"

export type { User, RunnerProfile, TrainingPlan }

// ─── Session ───────────────────────────────────────────────────────────────
export type SessionUser = {
  id?: string | null
  name?: string | null
  email?: string | null
  image?: string | null
}

// ─── Distance ──────────────────────────────────────────────────────────────
export type TargetDistance =
  | "3k_beginner"
  | "5k"
  | "mini_marathon"
  | "half_marathon"
  | "full_marathon"
  | "ultra_50"
  | "ultra_100"
  | "trail"

export const TARGET_DISTANCE_LABELS: Record<TargetDistance, string> = {
  "3k_beginner": "3K (เริ่มต้น < 28 นาที)",
  "5k": "5K",
  "mini_marathon": "Mini Marathon (10K)",
  "half_marathon": "Half Marathon (21.1K)",
  "full_marathon": "Full Marathon (42.2K)",
  "ultra_50": "Ultra 50K",
  "ultra_100": "Ultra 100K",
  "trail": "Trail Running",
}

export const TARGET_DISTANCE_ICONS: Record<TargetDistance, string> = {
  "3k_beginner": "🌱",
  "5k": "⚡",
  "mini_marathon": "🏃",
  "half_marathon": "🥈",
  "full_marathon": "🏅",
  "ultra_50": "💪",
  "ultra_100": "🔥",
  "trail": "🌲",
}

// ─── Workout types ─────────────────────────────────────────────────────────
export type WorkoutType =
  | "rest"
  | "easy"
  | "long"
  | "tempo"
  | "interval"
  | "race_pace"
  | "recovery"
  | "hills"
  | "cross_train"
  | "fartlek"
  | "strides"
  // ─── Sports science types (Runner's Rosetta Stone) ───
  | "progressive"      // gradually increasing pace throughout session
  | "pyramid"          // 200m→400m→800m→1km→800m→400m→200m
  | "drop_set"         // 1km→800m→600m→400m→200m, pace increases each rep
  | "broken_mile"      // tempo split into segments with brief rest
  | "fartlek_rolling"  // structured: 400m tempo + 400m steady, continuous
  // ─── Trail-specific types ───
  | "power_hike"       // trail: power hiking on steep climbs (arm drive, high cadence)

export const WORKOUT_LABELS: Record<WorkoutType, string> = {
  rest: "พัก",
  easy: "Easy Run",
  long: "Long Run",
  tempo: "Tempo",
  interval: "Interval",
  race_pace: "Race Pace",
  recovery: "Recovery",
  hills: "Hills",
  cross_train: "Cross Train",
  fartlek: "Fartlek",
  strides: "Strides",
  progressive: "Progressive Run",
  pyramid: "Pyramid Intervals",
  drop_set: "Drop Sets",
  broken_mile: "Broken Mile",
  fartlek_rolling: "Fartlek Rolling",
  power_hike: "Power Hike",
}

export const WORKOUT_COLORS: Record<WorkoutType, string> = {
  rest: "#555555",
  easy: "#4af0ff",
  long: "#e8ff4a",
  tempo: "#ff9f4a",
  interval: "#ff4a4a",
  race_pace: "#b44aff",
  recovery: "#4a9fff",
  hills: "#ff8c4a",
  cross_train: "#4aff8c",
  fartlek: "#ffd64a",
  strides: "#74c8ff",
  progressive: "#c84aff",
  pyramid: "#a04aff",
  drop_set: "#ff6a4a",
  broken_mile: "#ff7a4a",
  fartlek_rolling: "#c8ff4a",
  power_hike: "#a0522d",
}

// ─── Training phase ────────────────────────────────────────────────────────
export type TrainingPhase = "base" | "build" | "peak" | "taper"

export const PHASE_COLORS: Record<TrainingPhase, string> = {
  base: "#4af0ff",
  build: "#ff9f4a",
  peak: "#ff4a4a",
  taper: "#b44aff",
}

export const PHASE_NAMES: Record<TrainingPhase, string> = {
  base: "Base Training",
  build: "Speed & Strength",
  peak: "Peak Training",
  taper: "Peak & Taper",
}

// ─── Generated plan data structures ───────────────────────────────────────
export type GeneratedDay = {
  type: WorkoutType
  distance: number
  pace: string
  description: string
  rpe: number
  notes: string
}

export type GeneratedWeek = {
  weekNumber: number
  phase: string
  totalKm: number
  days: GeneratedDay[]
}

export type GeneratedPlan = {
  weeks: GeneratedWeek[]
  projectedFinishTime: string
  improvementRange: string
}

// ─── Engine input ──────────────────────────────────────────────────────────
export type PlanGenerationInput = {
  targetDistance: TargetDistance
  trainingWeeks: number
  daysPerWeek: number
  trainingDays: number[]
  longRunDay: number
  intensity: "gentle" | "normal" | "challenging" | "elite"
  pr5k?: string
  pr10k?: string
  prHalf?: string
  prFull?: string
  age?: number         // used for HR zone calculations (Tanaka formula)
  morningZone2?: boolean
}

// ─── Wizard state ──────────────────────────────────────────────────────────
export type WizardFormState = {
  targetDistance: TargetDistance | ""
  startDate: string
  raceDate: string
  trainingWeeks: number
  daysPerWeek: number
  trainingDays: number[]
  longRunDay: number
  sessionTime: "morning" | "evening" | "both"
  morningZone2: boolean
  morningMinutes: number
  eveningMinutes: number
  pr5k: string
  pr10k: string
  prHalf: string
  prFull: string
  intensity: "gentle" | "normal" | "challenging" | "elite"
  terrainType: string
  runMode: "outdoor" | "treadmill"
  name: string
}

// ─── Workout completion ────────────────────────────────────────────────────
export type CompletionRecord = {
  completion: number
  note?: string | null
}

export type CompletionMap = Record<string, CompletionRecord>
