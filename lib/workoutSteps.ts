import type { WorkoutType } from "@/types"

export type StepActivity = "RUN" | "REST" | "WALK"

export type WorkoutStep = {
  id: number
  activity: StepActivity
  description: string
  distance?: string
  pace?: string
  duration?: string
  paceNote?: string
}

export type WorkoutSection = {
  key: string
  label: string
  type: "warmup" | "main" | "repeat" | "cooldown" | "notes"
  color?: string
  repeatCount?: number
  steps: WorkoutStep[]
  coachNote?: string
}

/** Parse pace "M:SS" → seconds */
function parsePaceSec(pace: string): number {
  const p = pace.split(":").map(Number)
  return p.length === 2 ? p[0] * 60 + p[1] : 0
}

/** Format seconds to "M:SS" */
function fmtPace(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

/** Pace for a specific multiplier */
function derivePace(basePace: string, mult: number): string {
  const sec = parsePaceSec(basePace)
  return sec > 0 ? fmtPace(Math.round(sec * mult)) : basePace
}

/** Speed label for treadmill (km/h from pace) */
export function speedLabel(pace: string, treadmill: boolean): string {
  if (!treadmill || pace === "N/A") return `${pace}/km`
  const sec = parsePaceSec(pace)
  if (sec <= 0) return `${pace}/km`
  const speed = Math.round((3600 / sec) * 10) / 10
  return `${pace}/km (${speed.toFixed(1)} km/h)`
}

// ─── Step generators ───────────────────────────────────────────────────────

function warmupSection(easyPace: string, treadmill: boolean): WorkoutSection {
  return {
    key: "warmup",
    label: "Warm-Up",
    type: "warmup",
    color: "#4af0ff",
    steps: [
      {
        id: 1,
        activity: "WALK",
        description: "เดินเร็ว กระตุ้นกล้ามเนื้อ",
        duration: "5 นาที",
        paceNote: "ผ่อนคลาย ยืดกล้ามเนื้อไปด้วย",
      },
      {
        id: 2,
        activity: "RUN",
        description: "วิ่ง Easy เบาๆ",
        distance: "1 km",
        pace: easyPace,
        paceNote: `ไม่เกิน ${easyPace}/km — สบาย คุยได้`,
      },
    ],
  }
}

function cooldownSection(easyPace: string, startId: number): WorkoutSection {
  return {
    key: "cooldown",
    label: "Cool Down",
    type: "cooldown",
    color: "#4af0ff",
    steps: [
      {
        id: startId,
        activity: "RUN",
        description: "วิ่ง Easy ช้าๆ",
        distance: "1 km",
        pace: derivePace(easyPace, 1.1),
        paceNote: "ช้าลงทีละน้อย ลดอัตราหัวใจ",
      },
      {
        id: startId + 1,
        activity: "WALK",
        description: "เดินลดอุณหภูมิ + ยืดเหยียด",
        duration: "5 นาที",
        paceNote: "ยืดกล้ามเนื้อหลัก: น่อง ต้นขา สะโพก",
      },
    ],
  }
}

// ─── Per workout type generators ───────────────────────────────────────────

function buildEasy(distance: number, pace: string, treadmill: boolean): WorkoutSection[] {
  return [
    warmupSection(pace, treadmill),
    {
      key: "main",
      label: "Main Workout",
      type: "main",
      color: "#4af0ff",
      steps: [
        {
          id: 3,
          activity: "RUN",
          description: "Easy Run — วิ่งสบาย คุยได้ตลอด",
          distance: `${Math.max(1, distance - 2).toFixed(1)} km`,
          pace,
          paceNote: `ไม่เกิน ${pace}/km — ไม่มีเร็วเกินไป มีแต่ช้าเกินไปไม่มี`,
        },
      ],
      coachNote: "หากรู้สึกหนักเกินให้ชะลอลงทันที Easy Run คือรากฐานสำคัญที่สุดของการซ้อม",
    },
    cooldownSection(pace, 4),
  ]
}

function buildProgressive(distance: number, easePace: string, tempoPace: string, treadmill: boolean): WorkoutSection[] {
  const mainDist = Math.max(2, distance - 2)
  const seg = (mainDist / 3).toFixed(1)
  const midPace = fmtPace(Math.round((parsePaceSec(easePace) + parsePaceSec(tempoPace)) / 2))
  return [
    warmupSection(easePace, treadmill),
    {
      key: "main",
      label: "Progressive Run",
      type: "main",
      color: "#c84aff",
      steps: [
        { id: 3, activity: "RUN", description: "Segment 1 — Easy (สบาย คุยได้)", distance: `${seg} km`, pace: easePace, paceNote: "เริ่มช้า อย่าออกแรงมาก" },
        { id: 4, activity: "RUN", description: "Segment 2 — Moderate (เพิ่ม effort)", distance: `${seg} km`, pace: midPace, paceNote: "รู้สึกหนักขึ้น แต่ยังคุยได้สั้นๆ" },
        { id: 5, activity: "RUN", description: "Segment 3 — Tempo (จบแรง!)", distance: `${seg} km`, pace: tempoPace, paceNote: "หนักแต่ยังไหว เร่งให้ได้ถึงเส้นชัย" },
      ],
      coachNote: "กุญแจคือการเริ่มช้ากว่าที่คิด 3 segment สุดท้ายต้องรู้สึกหนักที่สุด",
    },
    cooldownSection(easePace, 6),
  ]
}

function buildTempo(distance: number, easePace: string, tempoPace: string, treadmill: boolean): WorkoutSection[] {
  const mainDist = Math.max(1.5, distance - 2)
  return [
    warmupSection(easePace, treadmill),
    {
      key: "main",
      label: "Tempo Run",
      type: "main",
      color: "#ff9f4a",
      steps: [
        {
          id: 3, activity: "RUN",
          description: "Tempo — Comfortably Hard ต่อเนื่อง",
          distance: `${mainDist.toFixed(1)} km`, pace: tempoPace,
          paceNote: "รู้สึกหนักแต่ยังไหว คุยได้แค่ 2-3 คำ",
        },
      ],
      coachNote: "Tempo pace = ระดับ lactate threshold รักษาเพซให้คงที่ตลอด อย่าเร็วเกินช่วงแรก",
    },
    cooldownSection(easePace, 4),
  ]
}

function buildInterval(distance: number, easePace: string, intervalPace: string, treadmill: boolean): WorkoutSection[] {
  const mainDist = Math.max(2, distance - 2)
  const reps = Math.max(4, Math.round(mainDist / 0.8))
  return [
    warmupSection(easePace, treadmill),
    {
      key: "repeat",
      label: `Repeat ×${reps}`,
      type: "repeat",
      color: "#ff4a4a",
      repeatCount: reps,
      steps: [
        { id: 3, activity: "RUN", description: "Interval", distance: "400 m", pace: intervalPace, paceNote: "เต็มที่แต่คุม form" },
        { id: 4, activity: "REST", description: "Active recovery", duration: "90 วินาที", paceNote: "เดินเบาๆ หรือหยุด" },
      ],
      coachNote: "Warm-up 10 นาทีก่อนเสมอ ทุก rep ควรรู้สึกหนักเท่ากัน ถ้า rep หลังๆ ช้ากว่า 5% ให้หยุด",
    },
    cooldownSection(easePace, 5),
  ]
}

function buildFartlekRolling(distance: number, easePace: string, tempoPace: string, steadyPace: string, treadmill: boolean): WorkoutSection[] {
  const mainDist = Math.max(2, distance - 2)
  const reps = Math.max(3, Math.round(mainDist / 0.8))
  return [
    warmupSection(easePace, treadmill),
    {
      key: "repeat",
      label: `Repeat ×${reps}`,
      type: "repeat",
      color: "#c8ff4a",
      repeatCount: reps,
      steps: [
        { id: 3, activity: "RUN", description: "400m Tempo effort", distance: "400 m", pace: tempoPace, paceNote: "Comfortably hard — หนักแต่ยังไหว" },
        { id: 4, activity: "RUN", description: "400m Steady recovery", distance: "400 m", pace: steadyPace, paceNote: "Active recovery — ยังวิ่งอยู่ ไม่หยุด" },
      ],
      coachNote: "ไม่มีการหยุดพัก! Active recovery คือหัวใจของ Rolling Fartlek ร่างกายเรียนรู้ recover ขณะเคลื่อนที่",
    },
    cooldownSection(easePace, 5),
  ]
}

function buildPyramid(distance: number, easePace: string, intervalPace: string, treadmill: boolean): WorkoutSection[] {
  const repPace = intervalPace
  return [
    warmupSection(easePace, treadmill),
    {
      key: "pyramid",
      label: "Pyramid Intervals",
      type: "repeat",
      color: "#a04aff",
      steps: [
        { id: 3, activity: "RUN", description: "200m — เริ่มต้น", distance: "200 m", pace: repPace },
        { id: 4, activity: "REST", description: "พัก", duration: "200 วินาที" },
        { id: 5, activity: "RUN", description: "400m — เพิ่มระยะ", distance: "400 m", pace: repPace },
        { id: 6, activity: "REST", description: "พัก", duration: "400 วินาที" },
        { id: 7, activity: "RUN", description: "800m — ขึ้นสูงสุด", distance: "800 m", pace: repPace },
        { id: 8, activity: "REST", description: "พัก", duration: "800 วินาที" },
        { id: 9, activity: "RUN", description: "1km — จุดสูงสุด!", distance: "1 km", pace: repPace, paceNote: "รักษาเพซให้ได้ถึงสุด" },
        { id: 10, activity: "REST", description: "พักยาว", duration: "2 นาที" },
        { id: 11, activity: "RUN", description: "800m — ลงบันได", distance: "800 m", pace: repPace },
        { id: 12, activity: "REST", description: "พัก", duration: "800 วินาที" },
        { id: 13, activity: "RUN", description: "400m — เกือบถึงแล้ว", distance: "400 m", pace: repPace },
        { id: 14, activity: "REST", description: "พัก", duration: "400 วินาที" },
        { id: 15, activity: "RUN", description: "200m — จบแรง!", distance: "200 m", pace: repPace, paceNote: "เร็วที่สุดเท่าที่ทำได้!" },
      ],
      coachNote: "200m สุดท้ายต้องเร็วกว่า 200m แรก พักเท่ากับระยะที่วิ่ง ทดสอบทั้ง pace control และ mental focus",
    },
    cooldownSection(easePace, 16),
  ]
}

function buildDropSet(distance: number, easePace: string, intervalPace: string, treadmill: boolean): WorkoutSection[] {
  return [
    warmupSection(easePace, treadmill),
    {
      key: "dropset",
      label: "Drop Sets",
      type: "repeat",
      color: "#ff6a4a",
      steps: [
        { id: 3, activity: "RUN", description: "Set 1 — 1km", distance: "1 km", pace: intervalPace },
        { id: 4, activity: "REST", description: "พัก", duration: "90 วินาที" },
        { id: 5, activity: "RUN", description: "Set 2 — 800m (เร็วขึ้น)", distance: "800 m", pace: derivePace(intervalPace, 0.97) },
        { id: 6, activity: "REST", description: "พัก", duration: "90 วินาที" },
        { id: 7, activity: "RUN", description: "Set 3 — 600m (เร็วขึ้น)", distance: "600 m", pace: derivePace(intervalPace, 0.94) },
        { id: 8, activity: "REST", description: "พัก", duration: "90 วินาที" },
        { id: 9, activity: "RUN", description: "Set 4 — 400m (เร็วมาก)", distance: "400 m", pace: derivePace(intervalPace, 0.91) },
        { id: 10, activity: "REST", description: "พัก", duration: "90 วินาที" },
        { id: 11, activity: "RUN", description: "Set 5 — 200m เต็มที่!", distance: "200 m", pace: derivePace(intervalPace, 0.85), paceNote: "All out! เร็วที่สุดเท่าที่ทำได้" },
      ],
      coachNote: "ยิ่งสั้นยิ่งต้องเร็ว Set 5 (200m) ต้องเร็วที่สุด ถ้าแผ่ว=ออกแรงมากช่วงต้นเกินไป",
    },
    cooldownSection(easePace, 12),
  ]
}

function buildBrokenMile(distance: number, easePace: string, tempoPace: string, treadmill: boolean): WorkoutSection[] {
  const mainDist = Math.max(2, distance - 2)
  const reps = Math.max(2, Math.round(mainDist / 1.2))
  return [
    warmupSection(easePace, treadmill),
    {
      key: "repeat",
      label: `Repeat ×${reps}`,
      type: "repeat",
      color: "#ff7a4a",
      repeatCount: reps,
      steps: [
        { id: 3, activity: "RUN", description: "Broken Mile segment", distance: "1.2 km", pace: tempoPace, paceNote: "Tempo effort — หนักแต่ยังไหว" },
        { id: 4, activity: "REST", description: "พักสั้น", duration: "45 วินาที", paceNote: "พักเดิน — กลับมาเร็วที่สุด" },
      ],
      coachNote: "45 วินาทีพักเท่านั้น! เป้าหมายคือจบทุก segment ด้วยแรง ฝึก mental toughness และ strong finish",
    },
    cooldownSection(easePace, 5),
  ]
}

function buildLong(distance: number, easePace: string, longPace: string, treadmill: boolean): WorkoutSection[] {
  const mainDist = Math.max(3, distance - 2)
  return [
    {
      key: "warmup",
      label: "Warm-Up",
      type: "warmup",
      color: "#4af0ff",
      steps: [
        { id: 1, activity: "WALK", description: "เดินเร็ว กระตุ้นข้อต่อ", duration: "5-10 นาที", paceNote: "อบอุ่นร่างกาย ยืดกล้ามเนื้อ dynamic" },
      ],
    },
    {
      key: "main",
      label: "Long Run",
      type: "main",
      color: "#e8ff4a",
      steps: [
        {
          id: 2, activity: "RUN",
          description: "Long Easy Run — วิ่งช้าๆ ต่อเนื่อง",
          distance: `${mainDist.toFixed(1)} km`, pace: longPace,
          paceNote: `ไม่เกิน ${longPace}/km — Long Run ยิ่งช้ายิ่งดี`,
        },
      ],
      coachNote: "Long Run ช้าๆ สบาย HR ไม่เกิน 75% max เดินได้ถ้าจำเป็น กิน gel ทุก 45 นาที ดื่มน้ำทุก 20 นาที",
    },
    {
      key: "cooldown",
      label: "Cool Down",
      type: "cooldown",
      color: "#4af0ff",
      steps: [
        { id: 3, activity: "WALK", description: "เดินลดอุณหภูมิ", duration: "5-10 นาที", paceNote: "ยืดกล้ามเนื้อ: น่อง ต้นขา สะโพก IT band" },
      ],
    },
  ]
}

function buildRacePace(distance: number, easePace: string, racePace: string, treadmill: boolean): WorkoutSection[] {
  const mainDist = Math.max(1, distance - 3)
  const reps = Math.max(2, Math.round(mainDist / 1.5))
  return [
    warmupSection(easePace, treadmill),
    {
      key: "strides",
      label: "Strides",
      type: "main",
      color: "#b44aff",
      steps: [
        { id: 3, activity: "RUN", description: "Strides — เร่งสั้น 4×80m", distance: "320 m total", paceNote: "เร่งอย่างนุ่มนวล 75-90% max speed" },
      ],
    },
    {
      key: "repeat",
      label: `Repeat ×${reps}`,
      type: "repeat",
      color: "#b44aff",
      repeatCount: reps,
      steps: [
        { id: 4, activity: "RUN", description: "Race Pace segment", distance: "1.2 km", pace: racePace, paceNote: "นี่คือเพซที่จะแข่งจริง จำ rhythm ไว้" },
        { id: 5, activity: "REST", description: "พัก easy jog", duration: "2 นาที", paceNote: "Jog เบาๆ ไม่หยุดหัวใจทำงานอยู่" },
      ],
      coachNote: "ฝึกให้ร่างกายจำเพซแข่ง ไม่เร็วเกิน ไม่ช้าเกิน ทุก rep ต้องรู้สึกเหมือนกัน",
    },
    cooldownSection(easePace, 6),
  ]
}

function buildHills(distance: number, easePace: string, hillPace: string, treadmill: boolean): WorkoutSection[] {
  const reps = 8
  return [
    warmupSection(easePace, treadmill),
    {
      key: "repeat",
      label: `Repeat ×${reps}`,
      type: "repeat",
      color: "#ff8c4a",
      repeatCount: reps,
      steps: [
        { id: 3, activity: "RUN", description: "วิ่งขึ้นเนิน", distance: "200 m", pace: hillPace, paceNote: "Effort สูง แต่ form ดี อย่าก้มหลัง" },
        { id: 4, activity: "WALK", description: "เดินลงเนิน (recovery)", duration: "90 วินาที", paceNote: "เดินลงช้าๆ ห้ามวิ่งลงเร็ว เข่าจะบาดเจ็บ" },
      ],
      coachNote: "Hill repeats สร้าง power และ VO2max เร็วกว่า flat interval ขึ้นด้วย effort ลงด้วยความระวัง",
    },
    cooldownSection(easePace, 5),
  ]
}

function buildRest(): WorkoutSection[] {
  return [
    {
      key: "rest",
      label: "Rest Day",
      type: "main",
      color: "#555",
      steps: [
        { id: 1, activity: "REST", description: "พักผ่อนเต็มที่", paceNote: "ห้ามวิ่ง! การพักคือส่วนหนึ่งของการซ้อม" },
        { id: 2, activity: "WALK", description: "เดินเบาๆ 15-30 นาที (optional)", paceNote: "Active recovery — ดีกว่านอนทั้งวัน" },
      ],
      coachNote: "Supercompensation เกิดขึ้นตอนพัก ไม่ใช่ตอนซ้อม วันพักสำคัญเท่าวันซ้อม",
    },
  ]
}

function buildRecovery(distance: number, recoveryPace: string, treadmill: boolean): WorkoutSection[] {
  return [
    {
      key: "main",
      label: "Recovery Run",
      type: "main",
      color: "#4a9fff",
      steps: [
        {
          id: 1, activity: "RUN",
          description: "Easy Recovery Jog",
          distance: `${distance.toFixed(1)} km`, pace: recoveryPace,
          paceNote: `ช้าที่สุดเท่าที่ทำได้ — ไม่เกิน ${recoveryPace}/km`,
        },
      ],
      coachNote: "Recovery Run ช่วยเพิ่มเลือดไปเลี้ยงกล้ามเนื้อ ลดอาการปวด แต่ต้องช้าจริงๆ",
    },
  ]
}

// ─── Main export ───────────────────────────────────────────────────────────

export function generateWorkoutSteps(
  type: WorkoutType,
  distance: number,
  paces: Record<WorkoutType, string>,
): WorkoutSection[] {
  const easy = paces.easy ?? "7:00"
  const tempo = paces.tempo ?? "5:30"
  const interval = paces.interval ?? "4:45"
  const longPace = paces.long ?? "7:30"
  const racePace = paces.race_pace ?? "5:15"
  const hillPace = paces.hills ?? "5:00"
  const recovery = paces.recovery ?? "8:00"
  const fartlekPace = paces.fartlek_rolling ?? "5:45"
  const steadyPace = derivePace(easy, 0.9) // between easy and tempo

  switch (type) {
    case "easy":      return buildEasy(distance, easy, false)
    case "progressive": return buildProgressive(distance, easy, tempo, false)
    case "tempo":     return buildTempo(distance, easy, tempo, false)
    case "interval":  return buildInterval(distance, easy, interval, false)
    case "fartlek_rolling": return buildFartlekRolling(distance, easy, fartlekPace, steadyPace, false)
    case "pyramid":   return buildPyramid(distance, easy, interval, false)
    case "drop_set":  return buildDropSet(distance, easy, interval, false)
    case "broken_mile": return buildBrokenMile(distance, easy, tempo, false)
    case "long":      return buildLong(distance, easy, longPace, false)
    case "race_pace": return buildRacePace(distance, easy, racePace, false)
    case "hills":     return buildHills(distance, easy, hillPace, false)
    case "fartlek":   return buildFartlekRolling(distance, easy, derivePace(easy, 0.85), steadyPace, false)
    case "strides":   return buildEasy(distance, easy, false)
    case "cross_train": return [{
      key: "main", label: "Cross Training", type: "main", color: "#4aff8c",
      steps: [
        { id: 1, activity: "RUN", description: "ปั่นจักรยาน / ว่ายน้ำ / โยคะ", duration: "45-60 นาที", paceNote: "Low impact แต่ active ดูแลหัวใจ" },
      ],
      coachNote: "Cross training ลด impact ต่อข้อต่อ ยังออกกำลังกายอยู่ เหมาะวันพักจากการวิ่ง",
    }]
    case "recovery":  return buildRecovery(distance, recovery, false)
    case "rest":      return buildRest()
    default:          return buildEasy(distance, easy, false)
  }
}
