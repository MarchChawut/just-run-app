import type {
  TargetDistance,
  WorkoutType,
  TrainingPhase,
  GeneratedDay,
  GeneratedWeek,
  GeneratedPlan,
  PlanGenerationInput,
  AlgorithmParams,
} from "@/types"
import { calcHRZones, type HRZones } from "@/lib/hrZones"
import { DEFAULT_MULTIPLIERS, DEFAULT_ALGORITHM_PARAMS } from "@/lib/formulaDefaults"
import { findTemplate, type PlanTemplate, type TemplateWorkout, type TemplatePace } from "@/lib/planTemplates"
import { buildTemplateWorkoutSteps } from "@/lib/workoutSteps"

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

// ─── Utilities ─────────────────────────────────────────────────────────────

/** Parse "HH:MM:SS" or "MM:SS" to total seconds (verbatim: y()) */
export function parseTimeToSeconds(t: string): number {
  const parts = t.split(":").map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

/** Parse "M:SS" pace string to seconds per km (verbatim: _()) */
function parsePaceToSeconds(p: string): number {
  const parts = p.split(":").map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

/** Format seconds/km to "M:SS" string (verbatim: v()) */
function formatPace(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

/** Format and clamp pace to realistic running range: 2:00–20:00/km (120–1200 sec) */
function clampPace(s: number): string {
  return formatPace(Math.max(120, Math.min(1200, Math.round(s))))
}

// ─── Phase logic ───────────────────────────────────────────────────────────
//
// Single source of truth for phase / deload-week resolution. All consumers
// (generateWeeklyKm, getPhase, assignDaySlots) work off the SAME 0-indexed
// week number and the SAME floored phase boundaries, so the volume curve, the
// phase label and the workout-easing always agree on which week is which.

/** Floored phase boundary indices (0-indexed week numbers). */
function getPhaseBoundaries(n: number, ap: AlgorithmParams) {
  return {
    baseEnd: Math.floor(n * ap.phaseBoundaryBase),
    buildEnd: Math.floor(n * ap.phaseBoundaryBuild),
    peakEnd: Math.floor(n * ap.phaseBoundaryPeak),
  }
}

/** Resolve the training phase for a 0-indexed week. */
function getPhaseForIndex(i: number, n: number, ap: AlgorithmParams): TrainingPhase {
  const { baseEnd, buildEnd, peakEnd } = getPhaseBoundaries(n, ap)
  if (i < baseEnd) return "base"
  if (i < buildEnd) return "build"
  if (i < peakEnd) return "peak"
  return "taper"
}

/** Is this 0-indexed week a scheduled deload week within the build phase? */
function isDeloadWeek(i: number, n: number, ap: AlgorithmParams): boolean {
  const { baseEnd } = getPhaseBoundaries(n, ap)
  return (
    getPhaseForIndex(i, n, ap) === "build" &&
    (i - baseEnd) % ap.recoveryWeekInterval === ap.recoveryWeekInterval - 1
  )
}

/** Determine training phase (verbatim: S()) — thin wrapper over getPhaseForIndex */
export function getPhase(
  weekNum: number,
  totalWeeks: number,
  ap: AlgorithmParams = DEFAULT_ALGORITHM_PARAMS,
): TrainingPhase {
  return getPhaseForIndex(weekNum - 1, totalWeeks, ap)
}

/** Phase display name (verbatim: ne()) */
export function getPhaseName(phase: TrainingPhase): string {
  return { base: "Base Training", build: "Speed & Strength", peak: "Peak Training", taper: "Peak & Taper" }[phase]
}

/** Elevation specificity multiplier by phase — vert ramps up toward race demand, then tapers. */
const VERT_SPECIFICITY: Record<TrainingPhase, number> = {
  base: 0.70, build: 0.90, peak: 1.10, taper: 0.60,
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

// ─── Pace calculation ──────────────────────────────────────────────────────

/** Calculate pace zones from PR data (verbatim: b()) */
export function calculatePaces(input: PlanGenerationInput): Record<WorkoutType, string> {
  let racePace = 0
  let baseDist = 0

  if (input.prFull) { racePace = parseTimeToSeconds(input.prFull) / 42.195; baseDist = 42.195 }
  else if (input.prHalf) { racePace = parseTimeToSeconds(input.prHalf) / 21.1; baseDist = 21.1 }
  else if (input.pr10k) { racePace = parseTimeToSeconds(input.pr10k) / 10; baseDist = 10 }
  else if (input.pr5k) { racePace = parseTimeToSeconds(input.pr5k) / 5; baseDist = 5 }

  // Validate: reject pace outside 2:00–20:00/km range (catches malformed PR inputs)
  if (!racePace || isNaN(racePace) || racePace < 120 || racePace > 1200) {
    racePace = 0
    baseDist = 0
  }

  if (!racePace || isNaN(racePace)) {
    // Use formula override if available, else hardcoded default per distance.
    // Typed (not `as`) so a missing key is a compile error — see exhaustiveness note.
    const defaultRacePaces: Record<TargetDistance, number> = {
      "3k_beginner": 560, "5k": 450, "mini_marathon": 420, "half_marathon": 390,
      "full_marathon": 390, "ultra_50": 420, "ultra_100": 480,
      "trail_15": 500, "trail_20": 510, "trail_30": 520, "trail_40": 530, "trail_50": 540,
    }
    racePace = input.formula?.defaultRacePace ?? defaultRacePaces[input.targetDistance]
  }

  // Adjust pace based on source distance
  let r = racePace
  if (baseDist === 5) r = racePace * 1.05
  else if (baseDist === 10) r = racePace
  else if (baseDist === 21.1) r = racePace * 0.94
  else if (baseDist === 42.195) r = racePace * 0.92

  // Intensity modifier
  const intensityMod = ({ gentle: 1.05, normal: 1, challenging: 0.97, elite: 0.94 } as Record<string, number>)[input.intensity]
  r *= intensityMod

  // Terrain modifier — flat surface penalty (technical trail), formula override or default
  const terrainMod = input.formula?.terrainModifier ?? (isTrailDistance(input.targetDistance) ? 15 : 0)
  r += terrainMod

  // Elevation gain penalty — extra sec/km proportional to climb density (m climbed per km).
  // gain flows into projected finish time automatically via getProjectedTime → calculatePaces.
  const config = DISTANCE_CONFIGS[input.targetDistance]
  const gain = input.elevationGain ?? input.formula?.defaultGain ?? config.defaultGain
  if (gain > 0 && config.km > 0) {
    const gainDensity = gain / config.km            // m/km
    r += gainDensity * (input.formula?.gainPaceFactor ?? 0.9)
  }

  // Use formula pace multipliers if available, else DEFAULT_MULTIPLIERS
  const m = { ...DEFAULT_MULTIPLIERS, ...(input.formula?.paceMultipliers ?? {}) }

  return {
    easy: clampPace(r * m.easy),
    long: clampPace(r * m.long),
    race_pace: clampPace(r * m.race_pace),
    tempo: clampPace(r * m.tempo),
    interval: clampPace(r * m.interval),
    recovery: clampPace(r * m.recovery),
    fartlek: clampPace(r * m.fartlek),
    hills: clampPace(r * m.hills),
    strides: clampPace(r * m.strides),
    cross_train: "N/A",
    rest: "N/A",
    progressive:     clampPace(r * m.progressive),
    pyramid:         clampPace(r * m.pyramid),
    drop_set:        clampPace(r * m.drop_set),
    broken_mile:     clampPace(r * m.broken_mile),
    fartlek_rolling: clampPace(r * m.fartlek_rolling),
    power_hike:      clampPace(r * m.power_hike),
  }
}

// ─── RPE ───────────────────────────────────────────────────────────────────

const RPE_BASE: Record<WorkoutType, number> = {
  rest: 0, recovery: 2, easy: 3, strides: 4, cross_train: 3,
  fartlek: 6, hills: 7, race_pace: 7, tempo: 8, interval: 9, long: 5,
  // Sports science types
  progressive: 4, pyramid: 8, drop_set: 8, broken_mile: 7, fartlek_rolling: 6,
  // Trail-specific
  power_hike: 4,
}

/** Get RPE for a workout type and phase (verbatim: w()) */
export function getRpe(type: WorkoutType, phase: TrainingPhase): number {
  let rpe = RPE_BASE[type] ?? 5
  if (phase === "peak") rpe = Math.min(10, rpe + 1)
  if (phase === "taper") rpe = Math.max(1, rpe - 1)
  return rpe
}

// ─── Coaching notes ────────────────────────────────────────────────────────

/** Get coaching notes for a workout (verbatim: pe()) */
export function getNotes(type: WorkoutType, phase: TrainingPhase, weekNum: number, zones?: HRZones, isTrail?: boolean): string {
  const z2 = zones ? `HR ${zones.zone2[0]}–${zones.zone2[1]} bpm (Zone 2)` : "HR ต่ำกว่า 75% max HR"
  const z3 = zones ? `HR ${zones.zone3[0]}–${zones.zone3[1]} bpm (Zone 3)` : "HR ~70–80% max"
  const z4 = zones ? `HR ${zones.zone4[0]}–${zones.zone4[1]} bpm (Zone 4)` : "HR ~80–90% max"
  const easyHR = zones ? `HR ไม่เกิน ${zones.zone2[1]} bpm (Zone 2)` : "คุยได้ตลอด"

  switch (type) {
    case "progressive":
      return `📈 เริ่มช้ากว่า Easy pace ปกติ — ค่อยๆ เพิ่ม effort ทุก 5 นาที · เริ่มที่ ${z2} → จบที่ ${z4}`
    case "pyramid":
      return phase === "build"
        ? "🔺 ฝึกการ pace ทุก rep ให้คงที่ — ขึ้นบันไดต้องรักษาเพซ ลงบันไดต้องเร็วขึ้น"
        : "🔺 Pyramid ทดสอบ mental focus — จดจำ effort แต่ละ rep ให้ได้"
    case "drop_set":
      return "⬇️ ทุก set สั้นลง = เพซเร็วขึ้น — ส่วนสำคัญคือ rep สุดท้าย 200m วิ่งเต็มที่"
    case "broken_mile":
      return "🔗 พักเพียง 30-60 วิ ระหว่าง segment — เป้าหมายคือจบแต่ละ segment แรงกว่าเริ่ม"
    case "fartlek_rolling":
      return phase === "base"
        ? "🔄 400m หนัก + 400m สบาย ไม่หยุด — ร่างกายเรียนรู้ recovery ขณะวิ่ง"
        : "🔄 ควบคุมให้ 400m Tempo รู้สึก 'หนักแต่ยังไหว' — 400m Steady คือ active recovery จริงๆ"
    case "interval":
      return zones
        ? `🔥 Warm-up 10 นาทีก่อนทุกครั้ง · Interval zone: ${zones.zone5[0]}–${zones.zone5[1]} bpm (Zone 5)`
        : "🔥 ทำ warm-up 10 นาทีก่อน interval ทุกครั้ง"
    case "tempo":
      return `💪 เพซ tempo = รู้สึก 'หนักแต่ยังไหว' · ${z4} · ควบคุมลมหายใจ`
    case "race_pace":
      return "🎯 ฝึกความรู้สึกเพซที่จะแข่งจริง — จำ rhythm ไว้"
    case "power_hike":
      return `🥾 Power Hike — ก้าวสั้น จังหวะเร็ว · arm drive แกว่งแรง · ${easyHR} · Power hiking ≠ แพ้ คือทักษะ trail ที่ต้องฝึก`
    case "long":
      if (isTrail) return phase === "peak"
        ? `⛰️ Long trail run — Time on feet > pace · hike ทุกเนิน >12% · สะสม elevation 300m+ · กิน gel ทุก 45 นาที`
        : `🌲 Long trail run ช้าๆ สบาย — ${z2} · Power hike ทุกที่ที่ชัน อย่าฝืนวิ่ง`
      return phase === "peak"
        ? `⚡ Long run สำคัญมาก — กิน gel ทุก 45 นาที · ${z3}`
        : `🏃 Long run ช้าๆ สบาย — ${z2} ตลอดการวิ่ง`
    case "easy":
      return `😌 วิ่งสบาย ${easyHR} — ไม่มีเร็วเกินไป มีแต่ช้าเกินไปไม่มี`
    case "rest":
      return "💤 พักผ่อนเต็มที่ — ยืดเหยียด foam roll ดูแลร่างกาย"
    case "hills":
      return zones
        ? `⛰️ วิ่งขึ้นเนินด้วย effort สูง ${z4}–Zone 5 · วิ่งลงเบาๆ Zone 2`
        : "⛰️ วิ่งขึ้นเนินด้วย effort สูง วิ่งลงเบาๆ"
    case "fartlek":
      return "🎲 วิ่งเร็ว-ช้าตามความรู้สึก ไม่ต้องดู pace"
    case "recovery":
      return zones
        ? `💙 Recovery Run — ${zones.zone1[0]}–${zones.zone2[0]} bpm (Zone 1–2) ยิ่งช้ายิ่งดี`
        : "💙 Recovery Run — ช้าสุดๆ ยิ่งช้ายิ่งดี"
    default:
      return phase === "taper" && weekNum > 1
        ? "⬇️ ลดระยะ ร่างกายกำลัง supercompensate — อย่าวิ่งเพิ่ม!"
        : ""
  }
}

// ─── Workout description ───────────────────────────────────────────────────

/** Build workout description string (verbatim: re()) */
export function buildDescription(type: WorkoutType, distance: number, pace: string): string {
  const d = distance.toFixed(1)
  switch (type) {
    case "easy":            return `Easy Run ${d} km · เพซ ${pace}/km — วิ่งสบาย คุยได้ตลอด ไม่มีเร็วเกินไป`
    case "long":            return `Long Run ${d} km · เพซ ${pace}/km — สร้าง aerobic base ควบคุม HR ต่ำ`
    case "tempo":           return `Tempo Run ${d} km · เพซ ${pace}/km — comfortably hard ต่อเนื่องไม่หยุด`
    case "interval":        return `Interval Training ${d} km · เพซ ${pace}/km — ซ้ำ 4-8 เซต พัก 90 วิ`
    case "fartlek":         return `Fartlek ${d} km — วิ่งเร็ว-ช้าสลับ ฟรีสไตล์ตาม effort`
    case "hills":           return `Hill Repeats ${d} km — วิ่งขึ้นเนิน 6-10 รอบ เสริมความแข็งแรง`
    case "race_pace":       return `Race Pace ${d} km · เพซ ${pace}/km — ฝึกเพซที่จะแข่งจริง`
    case "strides":         return `Easy + Strides ${d} km — วิ่งสบาย + เร่งสั้น 8×100m ท้ายซ้อม`
    case "cross_train":     return `Cross Training 45-60 นาที — ปั่นจักรยาน/ว่ายน้ำ/โยคะ ลด impact`
    case "recovery":        return `Recovery Run ${d} km · เพซ ${pace}/km — ฟื้นฟูแบบ active`
    case "rest":            return `Rest Day — พักผ่อน stretching เบาๆ หรือนวดกล้ามเนื้อ`
    // ─── Sports science types ───
    case "progressive":     return `Progressive Run ${d} km — เริ่ม Easy สบาย → เพิ่ม effort ทีละน้อย → จบด้วย Tempo · ฝึกการบริหารพลังงาน`
    case "pyramid":         return `Pyramid Intervals ${d} km · เพซ ${pace}/km — 200m→400m→800m→1km→800m→400m→200m · พัก = ระยะที่วิ่ง`
    case "drop_set":        return `Drop Sets ${d} km · เพซ ${pace}/km — 1km→800m→600m→400m→200m · เพซเร็วขึ้นทุก set`
    case "broken_mile":     return `Broken Mile ${d} km · เพซ ${pace}/km — แบ่งเป็น segment ย่อย พักสั้น 30-60 วิ · ฝึกความแข็งแกร่งและจบแรง`
    case "fartlek_rolling":  return `Fartlek Rolling ${d} km · เพซ ${pace}/km — 400m Tempo + 400m Steady สลับต่อเนื่อง ไม่หยุดพัก`
    case "power_hike":      return `Power Hike ${d} km — เดินเร็วด้วย arm drive บนเนินชัน ฝึกทักษะ trail หลัก`
    default:                return `Run ${d} km — เพซ ${pace}/km`
  }
}

// ─── Weekly km progression ─────────────────────────────────────────────────

/** Generate weekly km totals (verbatim: ee()) */
export function generateWeeklyKm(input: PlanGenerationInput): number[] {
  const config = DISTANCE_CONFIGS[input.targetDistance]
  const n = input.trainingWeeks
  const baseKm = input.formula?.baseKmPerWeek ?? config.baseKmPerWeek
  const peakKm = input.formula?.peakKmPerWeek ?? config.peakKmPerWeek
  const intensityMod = ({ gentle: 0.8, normal: 1, challenging: 1.1, elite: 1.2 } as Record<string, number>)[input.intensity]

  // Algorithm params — formula override first, then defaults
  const ap = { ...DEFAULT_ALGORITHM_PARAMS, ...(input.formula?.algorithmParams ?? {}) }

  const { buildEnd, peakEnd } = getPhaseBoundaries(n, ap)

  // Gentle week-1 start, then a smooth rising ramp that targets peakKm by the
  // end of the build phase. `rampEnd` is the last index of the rising ramp.
  const startKm = baseKm * ap.startKmFactor
  const rampEnd = Math.max(1, buildEnd - 1)

  // ── Pass 1: rise toward peakKm, then hold at peakKm through the peak phase ──
  // (taper is computed separately below, from the ACTUAL peak reached). Deload
  // dips ride on top of the still-rising trend → sawtooth that trends upward.
  const weeks: number[] = []
  for (let i = 0; i < peakEnd; i++) {
    let km: number
    if (i <= rampEnd) {
      const t = rampEnd > 0 ? i / rampEnd : 1
      km = startKm + (peakKm - startKm) * t
    } else {
      km = peakKm // peak-phase target (capped below for short plans)
    }
    if (isDeloadWeek(i, n, ap)) km *= ap.deloadFactor
    weeks.push(km)
  }

  // ── Pass 2: enforce the ~10% rule on every rising (non-deload) step ──
  // Applied through the peak phase too: on short plans the 10% cap means peakKm
  // may not be fully reachable — the plan then tops out at the safely-reachable
  // volume instead of spiking. Compare to the previous non-deload week so a
  // deload dip never makes the following recovery look like an illegal spike.
  let lastBuildUp = weeks[0]
  for (let i = 1; i < peakEnd; i++) {
    if (isDeloadWeek(i, n, ap)) continue
    const cap = lastBuildUp * (1 + ap.maxWeeklyIncrease)
    if (weeks[i] > cap) weeks[i] = cap
    lastBuildUp = weeks[i]
  }

  // ── Pass 3: taper down from the actual peak reached, into race day ──
  const peakReached = peakEnd > 0 ? weeks[peakEnd - 1] : peakKm
  for (let i = peakEnd; i < n; i++) {
    weeks.push(peakReached * Math.pow(ap.taperFactor, i - peakEnd + 1))
  }

  return weeks.map((km) => Math.max(5, Math.round(km * intensityMod)))
}

// ─── Day slot assignment ───────────────────────────────────────────────────

type DaySlot = { type: WorkoutType; ratio: number }

/** Assign workout types to day slots for one week (verbatim: te()) */
export function assignDaySlots(
  trainingDays: number[],
  longRunDay: number,
  daysPerWeek: number,
  weekNum: number,
  totalWeeks: number,
  phase: TrainingPhase,
  targetDistance?: TargetDistance,
  formulaPatterns?: import("@/types").PhasePatternMap,
  algorithmParams?: import("@/types").AlgorithmParams,
  gainDensity = 0,   // race elevation gain density (m/km) — drives hill/power-hike emphasis
): (DaySlot | null)[] {
  const ap = { ...DEFAULT_ALGORITHM_PARAMS, ...(algorithmParams ?? {}) }
  // Ease workouts on the SAME weeks the volume curve dips (scheduled deload),
  // plus the final two taper weeks. Uses the shared 0-indexed deload resolver
  // so workout-easing and the km deload always land on the same week.
  const isRecoveryWeek =
    isDeloadWeek(weekNum - 1, totalWeeks, ap) || weekNum >= totalWeeks - 2

  // Phase-specific patterns (sports science: Runner's Rosetta Stone)
  const days = Math.min(6, Math.max(3, daysPerWeek))
  const phasePatterns: Record<TrainingPhase, Record<number, WorkoutType[]>> = {
    base: {
      3: ["easy", "progressive"],
      4: ["easy", "progressive", "easy"],
      5: ["easy", "progressive", "easy", "fartlek_rolling"],
      6: ["easy", "progressive", "easy", "fartlek_rolling", "easy"],
    },
    build: {
      3: ["easy", "fartlek_rolling"],
      4: ["easy", "pyramid", "fartlek_rolling"],
      5: ["easy", "pyramid", "easy", "drop_set"],
      6: ["easy", "pyramid", "easy", "drop_set", "fartlek_rolling"],
    },
    peak: {
      3: ["easy", "broken_mile"],
      4: ["easy", "broken_mile", "drop_set"],
      5: ["easy", "drop_set", "easy", "broken_mile"],
      6: ["easy", "drop_set", "easy", "broken_mile", "race_pace"],
    },
    taper: {
      3: ["easy", "race_pace"],
      4: ["easy", "race_pace", "progressive"],
      5: ["easy", "race_pace", "easy", "progressive"],
      6: ["easy", "race_pace", "easy", "progressive", "easy"],
    },
  }

  // Trail-specific patterns: hills + power hiking emphasis
  const trailPatterns: Record<TrainingPhase, Record<number, WorkoutType[]>> = {
    base: {
      3: ["easy", "hills"],
      4: ["easy", "hills", "progressive"],
      5: ["easy", "hills", "easy", "progressive"],
      6: ["easy", "hills", "easy", "progressive", "power_hike"],
    },
    build: {
      3: ["hills", "power_hike"],
      4: ["hills", "power_hike", "fartlek_rolling"],
      5: ["hills", "power_hike", "easy", "fartlek_rolling"],
      6: ["hills", "power_hike", "easy", "fartlek_rolling", "hills"],
    },
    peak: {
      3: ["hills", "race_pace"],
      4: ["hills", "race_pace", "power_hike"],
      5: ["hills", "race_pace", "easy", "power_hike"],
      6: ["hills", "race_pace", "easy", "power_hike", "hills"],
    },
    taper: {
      3: ["easy", "race_pace"],
      4: ["easy", "race_pace", "easy"],
      5: ["easy", "race_pace", "easy", "progressive"],
      6: ["easy", "race_pace", "easy", "progressive", "easy"],
    },
  }

  // Priority: formula DB patterns (string keys) > trail/road defaults (number keys)
  const workoutPattern: WorkoutType[] = formulaPatterns
    ? ((formulaPatterns[phase]?.[String(days)] ?? formulaPatterns[phase]?.[days]) as WorkoutType[] | undefined) ?? ["easy", "hills"]
    : (targetDistance && isTrailDistance(targetDistance) ? trailPatterns : phasePatterns)[phase]?.[days] ?? ["easy", "hills"]

  // Hard workout types that get downgraded to easy on recovery weeks
  const HARD_TYPES = new Set<WorkoutType>([
    "interval", "tempo", "pyramid", "drop_set", "broken_mile",
    "race_pace", "fartlek_rolling", "hills",
  ])

  const base = ap.longRunRatioBase  // configurable base (default 0.38 for 4 days/week)
  const longRunRatio =
    daysPerWeek <= 3 ? Math.min(0.50, base + 0.07) :
    daysPerWeek === 4 ? base :
    daysPerWeek === 5 ? Math.max(0.22, base - 0.08) : Math.max(0.20, base - 0.11)
  const otherRatio = 1 - longRunRatio

  const otherDays = trainingDays.filter((d) => d !== longRunDay)
  const dayCount = otherDays.length

  // Resolve per-day workout types from the pattern.
  const types: WorkoutType[] = otherDays.map((_, i) => workoutPattern[i % workoutPattern.length])

  // Gain-tier emphasis (trail only): hillier races → inject power_hike / hills.
  // Done BEFORE the recovery downgrade so hills still ease on recovery weeks,
  // while power_hike (low intensity, not a HARD_TYPE) survives by design.
  const isTrail = !!targetDistance && isTrailDistance(targetDistance)
  if (isTrail && gainDensity >= 25) {
    let needHike = Math.max(0, 1 - types.filter((t) => t === "power_hike").length)
    let needHills = Math.max(0, (gainDensity > 45 ? 1 : 0) - types.filter((t) => t === "hills").length)
    for (let i = 0; i < types.length && (needHike > 0 || needHills > 0); i++) {
      if (types[i] !== "easy") continue
      if (needHike > 0) { types[i] = "power_hike"; needHike--; continue }
      if (needHills > 0) { types[i] = "hills"; needHills-- }
    }
  }

  const slots = otherDays.map((dayIdx, i) => {
    let wType: WorkoutType = types[i]
    if (isRecoveryWeek && HARD_TYPES.has(wType)) wType = "easy"
    return { dayIdx, type: wType, ratio: dayCount > 0 ? otherRatio / dayCount : 0 }
  })

  const result: (DaySlot | null)[] = Array(7).fill(null)
  for (const { dayIdx, type, ratio } of slots) {
    result[dayIdx] = { type, ratio }
  }
  if (trainingDays.includes(longRunDay)) {
    result[longRunDay] = {
      type: isRecoveryWeek ? "easy" : "long",
      ratio: isRecoveryWeek ? longRunRatio * 0.75 : longRunRatio,
    }
  }
  return result
}

// ─── Projected finish time ─────────────────────────────────────────────────

/** Calculate projected finish time from paces (verbatim: x()) */
export function getProjectedTime(input: PlanGenerationInput): { time: string; range: string } {
  const paces = calculatePaces(input)
  const config = DISTANCE_CONFIGS[input.targetDistance]
  const paceSec = parsePaceToSeconds(paces.race_pace)
  const totalSec = paceSec * config.km

  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = Math.round(totalSec % 60)
  const formatTime = (h: number, m: number, s: number) =>
    h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}` : `${m}:${s.toString().padStart(2, "0")}`

  // Range: -2 min to +1 min
  const lo = totalSec - 120
  const loH = Math.floor(lo / 3600), loM = Math.floor((lo % 3600) / 60)
  const hi = totalSec + 60
  const hiH = Math.floor(hi / 3600), hiM = Math.floor((hi % 3600) / 60)

  return {
    time: formatTime(h, m, s),
    range: `${loH > 0 ? loH + ":" : ""}${loM.toString().padStart(2, "0")} – ${hiH > 0 ? hiH + ":" : ""}${hiM.toString().padStart(2, "0")}`,
  }
}

// ─── Main plan generator ───────────────────────────────────────────────────

// ─── Template-backed generation (exact static plans) ─────────────────────────

/** Scale every "M:SS" and "H:MM:SS" time token in a string by `mod`, preserving
 *  each token's original format. Used to shift a template's projected finish time
 *  and pace-range text when intensity changes (finish time scales with pace). */
function scaleTimeString(str: string, mod: number): string {
  return str.replace(/\d{1,2}:\d{2}(?::\d{2})?/g, (token) => {
    const sec = Math.round(parseTimeToSeconds(token) * mod)
    if (token.split(":").length === 3) {
      const h = Math.floor(sec / 3600)
      const m = Math.floor((sec % 3600) / 60)
      const s = sec % 60
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    }
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  })
}

/** Apply the intensity modifier to a template's paces + projected time.
 *  Same ±% the parametric engine uses in calculatePaces (gentle slower, elite
 *  faster). Distances are left untouched — only pace and finish time move.
 *  Returns the template unchanged for "normal" (mod === 1). */
function scaleTemplateForIntensity(template: PlanTemplate, intensity: string): PlanTemplate {
  const mod = ({ gentle: 1.05, normal: 1, challenging: 0.97, elite: 0.94 } as Record<string, number>)[intensity] ?? 1
  if (mod === 1) return template

  const scalePace = (p: TemplatePace): TemplatePace => ({
    target: Math.round(p.target * mod),
    rangeLo: p.rangeLo != null ? Math.round(p.rangeLo * mod) : undefined,
    rangeHi: p.rangeHi != null ? Math.round(p.rangeHi * mod) : undefined,
  })

  const paces: PlanTemplate["paces"] = {}
  for (const [type, p] of Object.entries(template.paces)) {
    if (p) paces[type as WorkoutType] = scalePace(p)
  }

  return {
    ...template,
    paces,
    projectedTime: scaleTimeString(template.projectedTime, mod),
    projectedRange: scaleTimeString(template.projectedRange, mod),
  }
}

/** Format a template pace (sec/km) to "M:SS", or "N/A" when absent. */
function templatePaceStr(t: PlanTemplate, type: WorkoutType): string {
  const p = t.paces[type] ?? t.paces.easy
  return p ? formatPace(p.target) : "N/A"
}

/** Build one GeneratedDay from a template workout (with store-and-replay detail). */
function templateDay(
  w: TemplateWorkout,
  t: PlanTemplate,
  phase: TrainingPhase,
  weekNum: number,
  zones?: HRZones,
): GeneratedDay {
  const distance = Math.round(w.distanceKm * 10) / 10
  const pace = templatePaceStr(t, w.type)
  const description = w.isRace
    ? `🏁 RACE DAY — Full Marathon ${w.distanceKm} km · เพซเป้าหมาย ${t.projectedRange}`
    : buildDescription(w.type, distance, pace)
  return {
    type: w.type,
    distance,
    pace,
    description,
    rpe: getRpe(w.type, phase),
    notes: w.note ?? (w.isRace ? "🏁 ออกตัวสบายๆ · แบ่งเพซให้ดี · negative split ถ้าทำได้" : getNotes(w.type, phase, weekNum, zones, false)),
    elevationGain: 0,
    detail: buildTemplateWorkoutSteps(w, t.paces),
  }
}

/** Replay a static template as a GeneratedPlan — exact week-by-week reproduction.
 *  Intensity shifts the template's paces + projected time (distances unchanged);
 *  "normal" reproduces the template verbatim. */
export function buildPlanFromTemplate(template: PlanTemplate, input: PlanGenerationInput): GeneratedPlan {
  const t = scaleTemplateForIntensity(template, input.intensity)
  const zones = input.age ? calcHRZones(input.age) : undefined

  // The template fixes days-per-week; use the user's chosen training days only
  // when the count matches, else fall back to the canonical layout.
  const trainingDays =
    input.trainingDays.length === t.daysPerWeek
      ? [...input.trainingDays].sort((a, b) => a - b)
      : getDefaultTrainingDays(t.daysPerWeek)
  const longRunDay = trainingDays.includes(input.longRunDay)
    ? input.longRunDay
    : trainingDays[trainingDays.length - 1]
  const otherDays = trainingDays.filter((d) => d !== longRunDay)

  const restDay = (): GeneratedDay => ({
    type: "rest",
    distance: 0,
    pace: "N/A",
    description: buildDescription("rest", 0, "N/A"),
    rpe: 0,
    notes: getNotes("rest", "base", 1, zones, false),
    elevationGain: 0,
  })

  // The template is the maximum-length plan. For a shorter window, keep the
  // race-specific back half (peak + taper + race) and drop early base weeks —
  // the sport-science way to compress a marathon build. `trainingWeeks` is
  // pre-clamped to [16, t.weeks] by the caller; guard here regardless.
  const targetWeeks = Math.min(t.weeks, Math.max(1, input.trainingWeeks || t.weeks))
  const schedule = t.schedule.slice(t.schedule.length - targetWeeks)

  const weeks: GeneratedWeek[] = schedule.map((week, i) => {
    const weekNum = i + 1
    const phase = getPhase(weekNum, schedule.length)
    const days: GeneratedDay[] = Array.from({ length: 7 }, restDay)

    if (week.days) {
      // Explicit fixed weekday layout (index 0=Sun … 6=Sat): place each workout
      // on its exact day, ignoring the user's chosen training days.
      week.days.forEach((w, di) => {
        if (w) days[di] = templateDay(w, t, phase, weekNum, zones)
      })
    } else {
      // Legacy quality/long layout: align quality workouts to the LAST otherDays
      // so short weeks drop the earliest weekday (rest), matching the Excel
      // (e.g. week 1 → Wed/Thu, not Mon/Wed). Full weeks have offset 0.
      const quality = (week.quality ?? []).slice(0, otherDays.length)
      const offset = otherDays.length - quality.length
      quality.forEach((w, j) => {
        days[otherDays[offset + j]] = templateDay(w, t, phase, weekNum, zones)
      })
      if (week.long) days[longRunDay] = templateDay(week.long, t, phase, weekNum, zones)
    }

    const totalKm = Math.round(days.reduce((s, d) => s + d.distance, 0) * 10) / 10
    const phaseName = week.phaseLabel ?? getPhaseName(phase)
    return { weekNumber: weekNum, phase: phaseName, totalKm, elevationGain: 0, days }
  })

  return { weeks, projectedFinishTime: t.projectedTime, improvementRange: t.projectedRange }
}

/** Generate the full training plan (verbatim: C()) */
export function generatePlan(input: PlanGenerationInput): GeneratedPlan {
  // Template-backed formula? Replay the exact static plan.
  const template = findTemplate(input.targetDistance, input.level, input.trainingGoal)
  if (template) return buildPlanFromTemplate(template, input)

  const paces = calculatePaces(input)
  const weeklyKm = generateWeeklyKm(input)
  const weeks: GeneratedWeek[] = []
  const zones = input.age ? calcHRZones(input.age) : undefined
  const isTrail = isTrailDistance(input.targetDistance)
  const ap = { ...DEFAULT_ALGORITHM_PARAMS, ...(input.formula?.algorithmParams ?? {}) }

  // Race elevation gain density (m/km) — drives hill/power-hike emphasis + notes.
  const config = DISTANCE_CONFIGS[input.targetDistance]
  const raceGain = input.elevationGain ?? input.formula?.defaultGain ?? config.defaultGain
  const gainDensity = config.km > 0 ? raceGain / config.km : 0

  for (let i = 0; i < input.trainingWeeks; i++) {
    const weekNum = i + 1
    const phase = getPhase(weekNum, input.trainingWeeks, ap)
    const phaseName = getPhaseName(phase)
    const totalKm = weeklyKm[i]

    // Use profile's trainingDays if length matches daysPerWeek, else use defaults
    const trainingDays =
      input.trainingDays.length === input.daysPerWeek
        ? input.trainingDays
        : getDefaultTrainingDays(input.daysPerWeek)

    const longRunDay =
      input.longRunDay >= 0 ? input.longRunDay : trainingDays[trainingDays.length - 1]

    const daySlots = assignDaySlots(
      trainingDays, longRunDay, input.daysPerWeek,
      weekNum, input.trainingWeeks, phase, input.targetDistance,
      input.formula?.phasePatterns, input.formula?.algorithmParams, gainDensity
    )

    const days: GeneratedDay[] = daySlots.map((slot) => {
      if (!slot) {
        return {
          type: "rest" as WorkoutType,
          distance: 0,
          pace: "N/A",
          description: buildDescription("rest", 0, "N/A"),
          rpe: 0,
          notes: getNotes("rest", phase, weekNum, zones, isTrail),
          elevationGain: 0,
        }
      }
      const distance = Math.max(2, Math.round(totalKm * slot.ratio * 10) / 10)
      const pace = paces[slot.type] ?? paces.easy
      // Per-session climb (D+): trail only; scales with race gain density and phase specificity.
      const elevationGain =
        isTrail && gainDensity > 0 && slot.type !== "cross_train"
          ? Math.round(distance * gainDensity * VERT_SPECIFICITY[phase])
          : 0
      return {
        type: slot.type,
        distance,
        pace,
        description: buildDescription(slot.type, distance, pace),
        rpe: getRpe(slot.type, phase),
        notes: getNotes(slot.type, phase, weekNum, zones, isTrail),
        elevationGain,
      }
    })

    const weekElevation = days.reduce((s, d) => s + d.elevationGain, 0)
    weeks.push({ weekNumber: weekNum, phase: phaseName, totalKm, elevationGain: weekElevation, days })
  }

  const projected = getProjectedTime(input)
  return { weeks, projectedFinishTime: projected.time, improvementRange: projected.range }
}

/**
 * Build an uncounted lead-in week (สัปดาห์เกริ่นนำ) for a mid-week start.
 *
 * When the user starts mid-week and fewer than 3 training days remain in that
 * first calendar week, those remaining runs shouldn't be crammed into "week 1"
 * of the structured progression. Instead they become easy lead-in runs on the
 * training days that fall on/after the start day-of-week. `weekNumber` is 0 and
 * `isLeadIn` is set so consumers render it as a lead-in, not a counted week.
 *
 * `firstWeek` is the real training week 1 — we borrow its easy-run distance so
 * the lead-in matches the plan's opening volume (works for both template and
 * parametric plans).
 */
export function buildLeadInWeek(
  input: PlanGenerationInput,
  startDow: number,
  firstWeek: GeneratedWeek,
): GeneratedWeek {
  const zones = input.age ? calcHRZones(input.age) : undefined
  const isTrail = isTrailDistance(input.targetDistance)
  const paces = calculatePaces(input)

  // Borrow the opening easy distance; fall back to a gentle fraction of week 1.
  const easyDay = firstWeek.days.find((d) => d.type === "easy" && d.distance > 0)
  const easyDistance = easyDay
    ? easyDay.distance
    : Math.max(3, Math.round(firstWeek.totalKm * 0.25))

  const trainingDays = new Set(input.trainingDays)
  const days: GeneratedDay[] = Array.from({ length: 7 }, (_, d) => {
    if (trainingDays.has(d) && d >= startDow) {
      return {
        type: "easy" as WorkoutType,
        distance: easyDistance,
        pace: paces.easy,
        description: buildDescription("easy", easyDistance, paces.easy),
        rpe: getRpe("easy", "base"),
        notes: getNotes("easy", "base", 1, zones, isTrail),
        elevationGain: 0,
      }
    }
    return {
      type: "rest" as WorkoutType,
      distance: 0,
      pace: "N/A",
      description: buildDescription("rest", 0, "N/A"),
      rpe: 0,
      notes: getNotes("rest", "base", 1, zones, isTrail),
      elevationGain: 0,
    }
  })

  const totalKm = Math.round(days.reduce((s, d) => s + d.distance, 0) * 10) / 10
  return { weekNumber: 0, phase: "เกริ่นนำ", totalKm, elevationGain: 0, days, isLeadIn: true }
}
