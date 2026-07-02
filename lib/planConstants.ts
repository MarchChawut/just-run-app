import type { TargetDistance } from "@/types"

// ─── Browser-safe plan primitives ────────────────────────────────────────────
//
// Leaf module: pure constants + tiny helpers that BOTH client components and the
// server engine need. It must NOT import planTemplates / workoutSteps / hrZones /
// formulaDefaults, so client components can import from here without dragging the
// (server-only) plan-generation engine into their bundle. lib/trainingEngine.ts
// re-exports everything below, so existing server imports keep working unchanged.

// ─── Distance configurations ───────────────────────────────────────────────
export type DistanceConfig = {
  label: string
  km: number
  minWeeks: number
  maxWeeks: number
  recommendedWeeks: number[]
  baseKmPerWeek: number
  peakKmPerWeek: number
  longRunMax: number
  defaultGain: number   // typical race elevation gain in meters (0 for road)
  icon: string
}

export const DISTANCE_CONFIGS: Record<TargetDistance, DistanceConfig> = {
  "3k_beginner": { label: "3K (เริ่มต้น < 28 นาที)", km: 3, minWeeks: 6, maxWeeks: 12, recommendedWeeks: [6, 8, 10, 12], baseKmPerWeek: 10, peakKmPerWeek: 24, longRunMax: 5, defaultGain: 0, icon: "🌱" },
  "5k":          { label: "5K", km: 5, minWeeks: 8, maxWeeks: 16, recommendedWeeks: [8, 10, 12, 16], baseKmPerWeek: 15, peakKmPerWeek: 35, longRunMax: 8, defaultGain: 0, icon: "⚡" },
  "mini_marathon": { label: "Mini Marathon (10K)", km: 10, minWeeks: 10, maxWeeks: 16, recommendedWeeks: [10, 12, 14, 16], baseKmPerWeek: 20, peakKmPerWeek: 50, longRunMax: 14, defaultGain: 0, icon: "🏃" },
  "half_marathon": { label: "Half Marathon (21.1K)", km: 21.1, minWeeks: 12, maxWeeks: 20, recommendedWeeks: [12, 14, 16, 18, 20], baseKmPerWeek: 30, peakKmPerWeek: 65, longRunMax: 22, defaultGain: 0, icon: "🥈" },
  "full_marathon": { label: "Full Marathon (42.2K)", km: 42.195, minWeeks: 16, maxWeeks: 24, recommendedWeeks: [16, 18, 20, 24], baseKmPerWeek: 40, peakKmPerWeek: 80, longRunMax: 35, defaultGain: 0, icon: "🏅" },
  "ultra_50":    { label: "Ultra 50K", km: 50, minWeeks: 20, maxWeeks: 32, recommendedWeeks: [20, 24, 28, 32], baseKmPerWeek: 50, peakKmPerWeek: 100, longRunMax: 45, defaultGain: 0, icon: "💪" },
  "ultra_100":   { label: "Ultra 100K", km: 100, minWeeks: 24, maxWeeks: 36, recommendedWeeks: [24, 28, 32, 36], baseKmPerWeek: 60, peakKmPerWeek: 120, longRunMax: 60, defaultGain: 0, icon: "🔥" },
  "trail_15":    { label: "Trail 15K", km: 15, minWeeks: 8, maxWeeks: 20, recommendedWeeks: [8, 10, 11, 12, 14, 16, 20], baseKmPerWeek: 25, peakKmPerWeek: 50, longRunMax: 18, defaultGain: 600, icon: "🌲" },
  "trail_20":    { label: "Trail 20K", km: 20, minWeeks: 8, maxWeeks: 22, recommendedWeeks: [8, 10, 11, 12, 16, 18, 22], baseKmPerWeek: 30, peakKmPerWeek: 60, longRunMax: 24, defaultGain: 900, icon: "🌲" },
  "trail_30":    { label: "Trail 30K", km: 30, minWeeks: 8, maxWeeks: 26, recommendedWeeks: [8, 10, 11, 12, 16, 20, 24, 26], baseKmPerWeek: 40, peakKmPerWeek: 75, longRunMax: 32, defaultGain: 1400, icon: "🏔️" },
  "trail_40":    { label: "Trail 40K", km: 40, minWeeks: 8, maxWeeks: 30, recommendedWeeks: [8, 10, 11, 12, 18, 22, 26, 30], baseKmPerWeek: 45, peakKmPerWeek: 90, longRunMax: 38, defaultGain: 2000, icon: "🏔️" },
  "trail_50":    { label: "Trail 50K", km: 50, minWeeks: 8, maxWeeks: 32, recommendedWeeks: [8, 10, 11, 12, 20, 24, 28, 32], baseKmPerWeek: 50, peakKmPerWeek: 100, longRunMax: 45, defaultGain: 2600, icon: "⛰️" },
}

/** True for any trail distance (trail_15 … trail_50). */
export function isTrailDistance(d: TargetDistance | string): boolean {
  return String(d).startsWith("trail")
}

/** Map legacy "trail" rows (pre-multi-distance) to trail_15 to avoid undefined lookups. */
export function normalizeDistance(d: string): TargetDistance {
  return (d === "trail" ? "trail_15" : d) as TargetDistance
}

// ─── Default training days ─────────────────────────────────────────────────

/** Default training day indices for a given days/week count (verbatim: ie()) */
export function getDefaultTrainingDays(daysPerWeek: number): number[] {
  return (
    {
      3: [1, 3, 6],
      4: [1, 3, 4, 6],
      5: [1, 2, 3, 4, 6],
      6: [1, 2, 3, 4, 5, 6],
    }[Math.min(6, Math.max(3, daysPerWeek))] ?? [1, 3, 6]
  )
}

// ─── Template metadata (client-safe mirror of PLAN_TEMPLATES) ────────────────
//
// The full static plans live in lib/planTemplates.ts (server-only — large
// schedule data). Client UI (the wizard) only needs to know whether a template
// exists for a distance × level × goal and its length/frequency — never the
// schedule. Keep this in sync with PLAN_TEMPLATES; planTemplates.ts has a
// dev-time drift check that warns if they diverge. Key scheme mirrors
// findTemplate(): `${distance}_${level}${goal === "endurance" ? "_endurance" : ""}`.
export const TEMPLATE_META: Record<string, { weeks: number; daysPerWeek: number }> = {
  full_marathon_beginner: { weeks: 22, daysPerWeek: 4 },
  full_marathon_beginner_endurance: { weeks: 22, daysPerWeek: 4 },
}

/** Client-safe template lookup: metadata only (weeks, daysPerWeek), or undefined. */
export function findTemplateMeta(
  distance: TargetDistance | string,
  level: string,
  goal: string = "performance",
): { weeks: number; daysPerWeek: number } | undefined {
  const suffix = goal === "endurance" ? "_endurance" : ""
  return TEMPLATE_META[`${distance}_${level}${suffix}`]
}
