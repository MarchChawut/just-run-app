import type { FormulaSettings, PaceMultipliers, AlgorithmParams, TargetDistance } from "@/types"

export const DEFAULT_ALGORITHM_PARAMS: AlgorithmParams = {
  phaseBoundaryBase: 0.40,
  phaseBoundaryBuild: 0.75,
  phaseBoundaryPeak: 0.90,
  deloadFactor: 0.80,
  peakOscillation: 0.85,
  taperFactor: 0.75,
  recoveryWeekInterval: 4,
  longRunRatioBase: 0.38,
}

export const DEFAULT_MULTIPLIERS: PaceMultipliers = {
  easy: 1.25, long: 1.15, race_pace: 1.04, tempo: 1.00,
  interval: 0.88, recovery: 1.35, fartlek: 1.10, hills: 0.95,
  strides: 1.20, progressive: 1.15, pyramid: 0.88, drop_set: 0.88,
  broken_mile: 1.02, fartlek_rolling: 1.07, power_hike: 1.60,
}

export const FORMULA_DEFAULTS: Record<string, FormulaSettings> = {
  "3k_beginner": {
    defaultRacePace: 560, terrainModifier: 0,
    baseKmPerWeek: 10, peakKmPerWeek: 24, longRunMax: 5,
    paceMultipliers: { ...DEFAULT_MULTIPLIERS },
  },
  "5k": {
    defaultRacePace: 450, terrainModifier: 0,
    baseKmPerWeek: 15, peakKmPerWeek: 35, longRunMax: 8,
    paceMultipliers: { ...DEFAULT_MULTIPLIERS },
  },
  "mini_marathon": {
    defaultRacePace: 420, terrainModifier: 0,
    baseKmPerWeek: 20, peakKmPerWeek: 50, longRunMax: 14,
    paceMultipliers: { ...DEFAULT_MULTIPLIERS },
  },
  "half_marathon": {
    defaultRacePace: 390, terrainModifier: 0,
    baseKmPerWeek: 30, peakKmPerWeek: 65, longRunMax: 22,
    paceMultipliers: { ...DEFAULT_MULTIPLIERS },
  },
  "full_marathon": {
    defaultRacePace: 390, terrainModifier: 0,
    baseKmPerWeek: 40, peakKmPerWeek: 80, longRunMax: 35,
    paceMultipliers: { ...DEFAULT_MULTIPLIERS },
  },
  "ultra_50": {
    defaultRacePace: 420, terrainModifier: 0,
    baseKmPerWeek: 50, peakKmPerWeek: 100, longRunMax: 45,
    paceMultipliers: { ...DEFAULT_MULTIPLIERS, easy: 1.30, recovery: 1.40 },
  },
  "ultra_100": {
    defaultRacePace: 480, terrainModifier: 0,
    baseKmPerWeek: 60, peakKmPerWeek: 120, longRunMax: 60,
    paceMultipliers: { ...DEFAULT_MULTIPLIERS, easy: 1.35, recovery: 1.45 },
  },
  "trail": {
    defaultRacePace: 480, terrainModifier: 30,
    baseKmPerWeek: 25, peakKmPerWeek: 50, longRunMax: 20,
    paceMultipliers: { ...DEFAULT_MULTIPLIERS, easy: 1.30, hills: 0.90, power_hike: 1.60 },
  },
}

export function getFormulaDefault(targetDistance: TargetDistance | string): FormulaSettings {
  return FORMULA_DEFAULTS[targetDistance] ?? FORMULA_DEFAULTS["5k"]
}
