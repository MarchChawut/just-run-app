export type HRZones = {
  max: number
  zone1: [number, number]  // 50–60% — recovery
  zone2: [number, number]  // 60–70% — aerobic base (easy/long runs)
  zone3: [number, number]  // 70–80% — aerobic development
  zone4: [number, number]  // 80–90% — lactate threshold (tempo)
  zone5: [number, number]  // 90–100% — VO2max (interval)
}

/** Tanaka formula: more accurate than 220-age, especially for athletes */
export function calcMaxHR(age: number): number {
  return Math.round(208 - 0.7 * age)
}

export function calcHRZones(age: number): HRZones {
  const max = calcMaxHR(age)
  return {
    max,
    zone1: [Math.round(max * 0.50), Math.round(max * 0.60)],
    zone2: [Math.round(max * 0.60), Math.round(max * 0.70)],
    zone3: [Math.round(max * 0.70), Math.round(max * 0.80)],
    zone4: [Math.round(max * 0.80), Math.round(max * 0.90)],
    zone5: [Math.round(max * 0.90), max],
  }
}
