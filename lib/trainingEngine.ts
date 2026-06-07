import type {
  TargetDistance,
  WorkoutType,
  TrainingPhase,
  GeneratedDay,
  GeneratedWeek,
  GeneratedPlan,
  PlanGenerationInput,
} from "@/types"
import { calcHRZones, type HRZones } from "@/lib/hrZones"

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
  icon: string
}

export const DISTANCE_CONFIGS: Record<TargetDistance, DistanceConfig> = {
  "3k_beginner": { label: "3K (เริ่มต้น < 28 นาที)", km: 3, minWeeks: 6, maxWeeks: 12, recommendedWeeks: [6, 8, 10, 12], baseKmPerWeek: 10, peakKmPerWeek: 24, longRunMax: 5, icon: "🌱" },
  "5k":          { label: "5K", km: 5, minWeeks: 8, maxWeeks: 16, recommendedWeeks: [8, 10, 12, 16], baseKmPerWeek: 15, peakKmPerWeek: 35, longRunMax: 8, icon: "⚡" },
  "mini_marathon": { label: "Mini Marathon (10K)", km: 10, minWeeks: 10, maxWeeks: 16, recommendedWeeks: [10, 12, 14, 16], baseKmPerWeek: 20, peakKmPerWeek: 50, longRunMax: 14, icon: "🏃" },
  "half_marathon": { label: "Half Marathon (21.1K)", km: 21.1, minWeeks: 12, maxWeeks: 20, recommendedWeeks: [12, 14, 16, 18, 20], baseKmPerWeek: 30, peakKmPerWeek: 65, longRunMax: 22, icon: "🥈" },
  "full_marathon": { label: "Full Marathon (42.2K)", km: 42.195, minWeeks: 16, maxWeeks: 24, recommendedWeeks: [16, 18, 20, 24], baseKmPerWeek: 40, peakKmPerWeek: 80, longRunMax: 35, icon: "🏅" },
  "ultra_50":    { label: "Ultra 50K", km: 50, minWeeks: 20, maxWeeks: 32, recommendedWeeks: [20, 24, 28, 32], baseKmPerWeek: 50, peakKmPerWeek: 100, longRunMax: 45, icon: "💪" },
  "ultra_100":   { label: "Ultra 100K", km: 100, minWeeks: 24, maxWeeks: 36, recommendedWeeks: [24, 28, 32, 36], baseKmPerWeek: 60, peakKmPerWeek: 120, longRunMax: 60, icon: "🔥" },
  "trail":       { label: "Trail Running", km: 30, minWeeks: 12, maxWeeks: 24, recommendedWeeks: [12, 16, 20, 24], baseKmPerWeek: 35, peakKmPerWeek: 70, longRunMax: 30, icon: "🌲" },
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

/** Determine training phase (verbatim: S()) */
export function getPhase(weekNum: number, totalWeeks: number): TrainingPhase {
  const ratio = weekNum / totalWeeks
  if (ratio < 0.4) return "base"
  if (ratio < 0.75) return "build"
  if (ratio < 0.9) return "peak"
  return "taper"
}

/** Phase display name (verbatim: ne()) */
export function getPhaseName(phase: TrainingPhase): string {
  return { base: "Base Training", build: "Speed & Strength", peak: "Peak Training", taper: "Peak & Taper" }[phase]
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
    racePace = ({ "3k_beginner": 560, "5k": 450, "mini_marathon": 420, "half_marathon": 390, "full_marathon": 390, "ultra_50": 420, "ultra_100": 480, "trail": 450 } as Record<TargetDistance, number>)[input.targetDistance]
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

  return {
    easy: clampPace(r * 1.25),
    long: clampPace(r * 1.15),
    race_pace: clampPace(r * 1.04),
    tempo: clampPace(r),
    interval: clampPace(r * 0.88),
    recovery: clampPace(r * 1.35),
    fartlek: clampPace(r * 1.1),
    hills: clampPace(r * 0.95),
    strides: clampPace(r * 1.2),
    cross_train: "N/A",
    rest: "N/A",
    // ─── Sports science types ───
    progressive:     clampPace(r * 1.15),
    pyramid:         clampPace(r * 0.88),
    drop_set:        clampPace(r * 0.88),
    broken_mile:     clampPace(r * 1.02),
    fartlek_rolling: clampPace(r * 1.07),
  }
}

// ─── RPE ───────────────────────────────────────────────────────────────────

const RPE_BASE: Record<WorkoutType, number> = {
  rest: 0, recovery: 2, easy: 3, strides: 4, cross_train: 3,
  fartlek: 6, hills: 7, race_pace: 7, tempo: 8, interval: 9, long: 5,
  // Sports science types
  progressive: 4, pyramid: 8, drop_set: 8, broken_mile: 7, fartlek_rolling: 6,
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
export function getNotes(type: WorkoutType, phase: TrainingPhase, weekNum: number, zones?: HRZones): string {
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
    case "long":
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
    default:                return `Run ${d} km — เพซ ${pace}/km`
  }
}

// ─── Weekly km progression ─────────────────────────────────────────────────

/** Generate weekly km totals (verbatim: ee()) */
export function generateWeeklyKm(input: PlanGenerationInput): number[] {
  const config = DISTANCE_CONFIGS[input.targetDistance]
  const n = input.trainingWeeks
  const baseKm = config.baseKmPerWeek
  const peakKm = config.peakKmPerWeek
  const intensityMod = ({ gentle: 0.8, normal: 1, challenging: 1.1, elite: 1.2 } as Record<string, number>)[input.intensity]
  const weeks: number[] = []

  const baseEnd = Math.floor(n * 0.4)
  const buildEnd = Math.floor(n * 0.75)
  const peakEnd = Math.floor(n * 0.9)

  for (let i = 0; i < n; i++) {
    let km = 0
    if (i < baseEnd) {
      const ratio = i / baseEnd
      km = baseKm + (peakKm * 0.7 - baseKm) * ratio
    } else if (i < buildEnd) {
      const ratio = (i - baseEnd) / (buildEnd - baseEnd)
      km = peakKm * 0.7 + peakKm * 0.3 * ratio
      if ((i - baseEnd) % 3 === 2) km *= 0.8
    } else if (i < peakEnd) {
      km = peakKm
      if (i % 2 === 1) km *= 0.85
    } else {
      km = peakKm * Math.pow(0.75, i - peakEnd + 1)
    }
    weeks.push(Math.max(5, Math.round(km * intensityMod)))
  }
  return weeks
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
): (DaySlot | null)[] {
  const isRecoveryWeek =
    (weekNum % 4 === 0 && phase === "build") || weekNum >= totalWeeks - 2

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
  const workoutPattern: WorkoutType[] =
    phasePatterns[phase]?.[days] ?? ["easy", "tempo"]

  // Hard workout types that get downgraded to easy on recovery weeks
  const HARD_TYPES = new Set<WorkoutType>([
    "interval", "tempo", "pyramid", "drop_set", "broken_mile",
    "race_pace", "fartlek_rolling",
  ])

  const longRunRatio =
    daysPerWeek <= 3 ? 0.45 :
    daysPerWeek === 4 ? 0.38 :
    daysPerWeek === 5 ? 0.30 : 0.27
  const otherRatio = 1 - longRunRatio

  const otherDays = trainingDays.filter((d) => d !== longRunDay)
  const dayCount = otherDays.length

  const slots = otherDays.map((dayIdx, i) => {
    let wType: WorkoutType = workoutPattern[i % workoutPattern.length]
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

/** Generate the full training plan (verbatim: C()) */
export function generatePlan(input: PlanGenerationInput): GeneratedPlan {
  const paces = calculatePaces(input)
  const weeklyKm = generateWeeklyKm(input)
  const weeks: GeneratedWeek[] = []
  const zones = input.age ? calcHRZones(input.age) : undefined

  for (let i = 0; i < input.trainingWeeks; i++) {
    const weekNum = i + 1
    const phase = getPhase(weekNum, input.trainingWeeks)
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
      weekNum, input.trainingWeeks, phase
    )

    const days: GeneratedDay[] = daySlots.map((slot) => {
      if (!slot) {
        return {
          type: "rest" as WorkoutType,
          distance: 0,
          pace: "N/A",
          description: buildDescription("rest", 0, "N/A"),
          rpe: 0,
          notes: getNotes("rest", phase, weekNum, zones),
        }
      }
      const distance = Math.max(2, Math.round(totalKm * slot.ratio * 10) / 10)
      const pace = paces[slot.type] ?? paces.easy
      return {
        type: slot.type,
        distance,
        pace,
        description: buildDescription(slot.type, distance, pace),
        rpe: getRpe(slot.type, phase),
        notes: getNotes(slot.type, phase, weekNum, zones),
      }
    })

    weeks.push({ weekNumber: weekNum, phase: phaseName, totalKm, days })
  }

  const projected = getProjectedTime(input)
  return { weeks, projectedFinishTime: projected.time, improvementRange: projected.range }
}
