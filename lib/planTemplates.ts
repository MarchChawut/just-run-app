import type { TargetDistance, WorkoutType, ExperienceLevel } from "@/types"
import { TEMPLATE_META } from "@/lib/planConstants"

// ─── Static plan templates ───────────────────────────────────────────────────
//
// The parametric engine (lib/trainingEngine.ts) generates plans from formulas.
// For (distance × level) combinations where we have a hand-designed reference
// plan, we store it verbatim here and replay it exactly — the engine detects a
// matching template and builds the plan straight from this data instead of
// computing it. This is how "exact week-by-week reproduction" is achieved.
//
// Source for full_marathon × beginner: public/Marathon_Training_Plan.xlsx

/** Pace as seconds/km. For easy/long this is a *limit* ("no faster than"). */
export type TemplatePace = { target: number; rangeLo?: number; rangeHi?: number }

/** One workout in a template week (a training day). */
export type TemplateWorkout = {
  type: WorkoutType
  distanceKm: number
  // interval-only: number of work reps and each rep's distance (km). Warm-up and
  // cool-down each = (distanceKm − reps·repKm) / 2.
  reps?: number
  repKm?: number
  racePrep?: boolean       // taper interval — lighter effort, race prep
  // long-only: race has "rolling terrain" segments (outdoor) / 1–2% incline (treadmill)
  rollingTerrain?: boolean
  isRace?: boolean         // race day — no treadmill substitute
  note?: string            // custom coaching note (overrides the generated one), e.g. cross-training modality
}

export type TemplateWeek = {
  // Two ways to describe a week:
  //  (a) legacy quality/long — non-long workouts placed on trainingDays\longRunDay,
  //      long on longRunDay (respects the user's chosen days).
  //  (b) explicit `days` — a FIXED 7-slot layout (index 0=Sun … 6=Sat); each
  //      non-null workout lands on that exact weekday, others are rest. Used by
  //      plans with a fixed weekday structure (cross-training days, mid-week rests).
  quality?: TemplateWorkout[]
  long?: TemplateWorkout
  days?: (TemplateWorkout | null)[]
  phaseLabel?: string      // custom phase name shown for the week (overrides computed phase)
}

export type PlanTemplate = {
  distance: TargetDistance
  level: ExperienceLevel
  weeks: number
  daysPerWeek: number
  paces: Partial<Record<WorkoutType, TemplatePace>>
  projectedTime: string
  projectedRange: string
  schedule: TemplateWeek[]  // length === weeks
}

// Shorthand constructors keep the 22-week table readable below.
const E = (km: number): TemplateWorkout => ({ type: "easy", distanceKm: km })
const T = (km: number): TemplateWorkout => ({ type: "tempo", distanceKm: km })
const H = (km: number): TemplateWorkout => ({ type: "hills", distanceKm: km })
const I = (km: number, reps: number, repKm = 1.0): TemplateWorkout =>
  ({ type: "interval", distanceKm: km, reps, repKm })
const L = (km: number, rollingTerrain = false): TemplateWorkout =>
  ({ type: "long", distanceKm: km, rollingTerrain })

const FULL_MARATHON_BEGINNER: PlanTemplate = {
  distance: "full_marathon",
  level: "beginner",
  weeks: 22,
  daysPerWeek: 4,
  // Beginner pace constants (sec/km). easy/long are conversational limits.
  paces: {
    easy: { target: 430 },                                  // ≤ 7:10/km
    long: { target: 430 },                                  // ≤ 7:10/km
    tempo: { target: 350, rangeLo: 335, rangeHi: 365 },     // 5:50 (5:35–6:05)
    interval: { target: 370, rangeLo: 355, rangeHi: 385 },  // 6:10 (5:55–6:25) — 1km cruise reps
    race_pace: { target: 355, rangeLo: 345, rangeHi: 365 }, // ~5:55 (5:45–6:05)
  },
  projectedTime: "4:02:00 – 4:17:00",
  projectedRange: "เพซเป้าหมาย ~5:45–6:05/km",
  schedule: [
    /* W1  */ { quality: [E(4.0), I(4.0, 2)],        long: L(6.5) },
    /* W2  */ { quality: [E(4.5), T(4.5), E(4.5)],   long: L(7.5) },
    /* W3  */ { quality: [H(4.4), T(5.0), E(5.0)],   long: L(9.0) },
    /* W4  */ { quality: [E(4.5), T(3.0), E(3.5)],   long: L(5.5) },   // deload
    /* W5  */ { quality: [I(4.5, 2), T(6.5), E(5.0)], long: L(10.0, true) },
    /* W6  */ { quality: [E(6.0), T(6.0), E(6.0)],   long: L(11.0, true) },
    /* W7  */ { quality: [T(6.5), I(6.4, 4), E(6.0)], long: L(12.0) },
    /* W8  */ { quality: [E(5.0), T(5.0), E(5.0)],   long: L(6.5) },   // deload
    /* W9  */ { quality: [T(5.0), H(6.8), E(7.5)],   long: L(14.0) },
    /* W10 */ { quality: [E(7.5), T(7.0), E(6.5)],   long: L(16.0) },
    /* W11 */ { quality: [I(7.5, 5), T(7.5), E(7.5)], long: L(18.0, true) },
    /* W12 */ { quality: [E(6.5), T(5.0), E(5.5)],   long: L(9.0) },   // deload
    /* W13 */ { quality: [I(7.5, 5), T(7.5), E(8.0)], long: L(20.0) },
    /* W14 */ { quality: [E(8.0), T(7.0), E(8.0)],   long: L(23.0) },
    /* W15 */ { quality: [H(7.0), T(7.5), E(9.0)],   long: L(18.0) },
    /* W16 */ { quality: [E(9.0), T(7.5), E(7.5)],   long: L(26.0) },
    /* W17 */ { quality: [I(5.0, 3), T(5.5), E(6.5)], long: L(13.0) }, // deload
    /* W18 */ { quality: [E(9.0), T(7.5), E(7.5)],   long: L(29.0, true) },
    /* W19 */ { quality: [I(7.4, 4, 1.25), T(7.5), E(9.0)], long: L(32.0) },
    /* W20 */ { quality: [E(9.0), T(6.0), E(8.0)],   long: L(22.0) },  // taper
    /* W21 */ { quality: [E(9.0), T(5.0), E(7.0)],   long: L(14.0, true) }, // taper
    /* W22 */ { quality: [{ type: "interval", distanceKm: 5.5, reps: 3, repKm: 1.0, racePrep: true }, E(5.5)],
                long: { type: "race_pace", distanceKm: 42.2, isRace: true } }, // race week
  ],
}

// ─── Full Marathon · Beginner · Endurance (injury-safe, no-speed) ────────────
//
// Source: user-provided science-based Bangkok Marathon 2026 plan. A gentler
// alternative to FULL_MARATHON_BEGINNER: ~8:30/km throughout, a Tuesday
// cross-training day to spare the knees, deload weeks (5, 9, 13, 17) and a 30km
// peak. Each week uses the explicit 7-day layout (index 0=Sun … 6=Sat).

const XC = (): TemplateWorkout =>
  ({ type: "cross_train", distanceKm: 0, note: "Cross-training 40–50 นาที (ปั่นจักรยาน/ว่ายน้ำ/เวทเบาๆ) ลดแรงกระแทกที่เข่า" })
const CORE = (): TemplateWorkout =>
  ({ type: "cross_train", distanceKm: 0, note: "แกนกลางลำตัว 20 นาที (Plank/Side-Plank/Bird-Dog) หรือพักฟื้น — เลือกได้" })
const RACE = (): TemplateWorkout =>
  ({ type: "race_pace", distanceKm: 42.195, isRace: true })

/** Build a fixed 7-day week [Sun,Mon,Tue,Wed,Thu,Fri,Sat]; Fri always rest. */
const ew = (
  mon: TemplateWorkout | null,
  wed: TemplateWorkout,
  thu: TemplateWorkout | null,
  sat: TemplateWorkout | null,
  phaseLabel: string,
): TemplateWeek => ({
  days: [CORE(), mon, XC(), wed, thu, null, sat],
  phaseLabel,
})

const FULL_MARATHON_BEGINNER_ENDURANCE: PlanTemplate = {
  distance: "full_marathon",
  level: "beginner",
  weeks: 22,
  daysPerWeek: 5,
  paces: {
    easy: { target: 510, rangeLo: 480, rangeHi: 540 },      // 8:30 (8:00–9:00)
    long: { target: 510, rangeLo: 480, rangeHi: 540 },
    race_pace: { target: 510, rangeLo: 480, rangeHi: 540 },
    interval: { target: 450, rangeLo: 435, rangeHi: 465 },  // ~7:30 — mild, safe
  },
  projectedTime: "6:00:00 – 6:30:00",
  projectedRange: "เพซเป้าหมาย ~8:30/km · เน้นจบปลอดภัย",
  schedule: [
    /* W1  Foundation */ ew(E(7), E(7), E(7), L(10), "Foundation (สร้างฐาน)"),
    /* W2  */            ew(E(7), E(7), E(7), L(10), "Foundation (สร้างฐาน)"),
    /* W3  */            ew(E(7), E(7), E(7), L(11), "Foundation (สร้างฐาน)"),
    /* W4  */            ew(E(7), E(7), E(7), L(12), "Foundation (สร้างฐาน)"),
    /* W5  deload */     ew(E(5), E(5), E(5), L(10), "Recovery Week (ดีโหลด)"),
    /* W6  */            ew(E(7), H(5), E(7), L(10), "Strength (ฝึกเนิน)"),
    /* W7  */            ew(E(7), H(5), E(7), L(12), "Strength (ฝึกเนิน)"),
    /* W8  */            ew(E(7), H(5), E(7), L(14), "Strength (ฝึกเนิน)"),
    /* W9  deload */     ew(E(5), E(4), E(5), L(10), "Recovery Week (ดีโหลด)"),
    /* W10 */            ew(E(7), I(5, 5, 0.4), E(7), L(11), "Speed/Interval (ฝึกปอด)"),
    /* W11 */            ew(E(7), I(5, 5, 0.6), E(8), L(12), "Speed/Interval (ฝึกปอด)"),
    /* W12 */            ew(E(7), T(6), E(7), L(14), "Speed/Interval (จุดอึด)"),
    /* W13 deload */     ew(E(5), E(5), E(6), L(10), "Recovery Week (ดีโหลด)"),
    /* W14 */            ew(E(8), E(8), E(4), L(16), "Endurance Peak (ขยายระยะ)"),
    /* W15 */            ew(E(8), E(8), E(4), L(18), "Endurance Peak (ขยายระยะ)"),
    /* W16 */            ew(E(8), E(8), E(4), L(20), "Endurance Peak (ปราการ 20K)"),
    /* W17 deload */     ew(E(5), E(5), E(6), L(12), "Recovery Week (ดีโหลด)"),
    /* W18 peak */       ew(E(8), E(8), E(4), L(30), "Peak Long Run (จุดสูงสุด)"),
    /* W19 taper */      ew(E(8), E(8), E(2), L(20), "Tapering (เรียวระยะ)"),
    /* W20 taper */      ew(E(6), E(6), E(1), L(15), "Tapering (เรียวระยะ)"),
    /* W21 taper */      ew(E(4), E(4), null, L(10), "Tapering (ความสดขีดสุด)"),
    /* W22 race */       { days: [null, null, XC(), E(4), E(4), null, RACE()], phaseLabel: "Race Week (วันแข่ง!)" },
  ],
}

const PLAN_TEMPLATES: Record<string, PlanTemplate> = {
  full_marathon_beginner: FULL_MARATHON_BEGINNER,
  full_marathon_beginner_endurance: FULL_MARATHON_BEGINNER_ENDURANCE,
}

// Dev-time drift guard: the client-safe TEMPLATE_META (lib/planConstants.ts) must
// mirror each template's weeks/daysPerWeek. Warn if they diverge so the wizard's
// metadata stays honest. Server-only; no effect in production.
if (process.env.NODE_ENV !== "production") {
  for (const [key, t] of Object.entries(PLAN_TEMPLATES)) {
    const meta = TEMPLATE_META[key]
    if (!meta || meta.weeks !== t.weeks || meta.daysPerWeek !== t.daysPerWeek) {
      console.warn(
        `[planTemplates] TEMPLATE_META drift for "${key}": template=${t.weeks}w/${t.daysPerWeek}d, meta=${meta ? `${meta.weeks}w/${meta.daysPerWeek}d` : "missing"}`,
      )
    }
  }
}

/** Look up a static template for a distance × level × goal, or undefined for parametric. */
export function findTemplate(
  distance: TargetDistance | string,
  level: ExperienceLevel | string,
  goal: string = "performance",
): PlanTemplate | undefined {
  const suffix = goal === "endurance" ? "_endurance" : ""
  return PLAN_TEMPLATES[`${distance}_${level}${suffix}`]
}
