# CODEBASE MAP — ตัวตึง Just Run!

> Stack: Next.js App Router · MariaDB (Synology NAS) · Prisma · NextAuth v5 · shadcn/ui · Tailwind CSS  
> Theme: dark, neon yellow `#E8FF4A`

---

## Directory Structure

```
just-run-app/
├── app/                     Next.js App Router
│   ├── (auth)/login/        Google Sign-In page (public)
│   ├── (app)/               Protected route group (session required)
│   │   ├── layout.tsx       Auth guard — redirects to /login if no session
│   │   ├── dashboard/       Weekly summary & active plan overview
│   │   ├── plan/            Plan list (all plans)
│   │   ├── plan/[id]/       Plan detail + interactive calendar
│   │   ├── plan/new/        New plan wizard
│   │   └── profile/         Runner profile settings
│   ├── api/
│   │   ├── auth/[...nextauth]/  NextAuth route handler
│   │   └── plan/            REST endpoint (GET list, POST create — legacy)
│   ├── actions/             Server Actions (Next.js "use server")
│   │   ├── plan.ts          createPlanFromWizard, updatePlan, deletePlan
│   │   ├── profile.ts       upsertProfile
│   │   └── workout.ts       saveCompletion (mark day done)
│   ├── generated/prisma/    Auto-generated Prisma client (do not edit)
│   ├── globals.css          Global styles + dark theme base
│   └── layout.tsx           Root layout (fonts, Toaster)
│
├── components/
│   ├── auth/
│   │   └── GoogleSignInButton.tsx    "use client" — triggers signIn("google")
│   ├── layout/
│   │   ├── Navbar.tsx               Top bar with user avatar + signOut
│   │   ├── Sidebar.tsx              Desktop side navigation
│   │   └── BottomNav.tsx            Mobile bottom tab bar
│   ├── plan/
│   │   ├── PlanWizardPage.tsx       6-step wizard for creating a plan
│   │   ├── PlanCalendarView.tsx     Month-grid calendar showing workout days
│   │   ├── DayActionSheet.tsx       Slide-up sheet: workout detail, steps, meals
│   │   ├── PlanDetailView.tsx       Week-by-week list view (alternative to calendar)
│   │   ├── PlanCard.tsx             Summary card shown on /plan list page
│   │   ├── PlanCardActions.tsx      Rename/delete/toggle-active menu for a plan
│   │   ├── TrainingCalendar.tsx     Compact calendar widget used in dashboard
│   │   └── CreatePlanDialog.tsx     Quick-create dialog (legacy, superseded by wizard)
│   ├── profile/
│   │   └── ProfileFormDialog.tsx    Edit runner profile (age, PRs, terrain, etc.)
│   └── ui/                          shadcn/ui auto-generated components (do not edit)
│
├── lib/
│   ├── trainingEngine.ts    CORE — generates the full training plan (parametric OR template-backed)
│   ├── planTemplates.ts     Static hand-designed plans replayed verbatim (findTemplate)
│   ├── workoutSteps.ts      Workout step-by-step definitions (warm-up, main, cool-down)
│   ├── formulaLoader.ts     Loads formula config (multipliers + algorithm params) per plan
│   ├── formulaDefaults.ts   DEFAULT_MULTIPLIERS + DEFAULT_ALGORITHM_PARAMS fallbacks
│   ├── activityLogger.ts    Records user activity events (logActivity)
│   ├── hrZones.ts           HR zone calculator (Tanaka formula: 208 − 0.7 × age)
│   ├── mealData.ts          Meal recommendations by workout type
│   ├── validations.ts       Zod schemas for all server action inputs
│   ├── prisma.ts            Prisma client singleton (dev-mode hot-reload safe)
│   ├── auth-utils.ts        Auth helper functions
│   └── utils.ts             Tailwind cn() utility (shadcn standard)
│
├── types/index.ts           All shared TypeScript types + display constants
├── prisma/schema.prisma     Database schema
├── auth.ts                  NextAuth config (Google provider + PrismaAdapter)
└── next.config.ts           Remote image domains (lh3.googleusercontent.com)
```

---

## Core Data Flow

```
User fills wizard (PlanWizardPage)
  └─▶ createPlanFromWizard (app/actions/plan.ts)
        ├─ validates with createPlanWizardSchema (Zod: + level, trainingGoal)
        ├─ reads age from RunnerProfile (for HR zones)
        ├─ computes leadInWeeks — if start is mid-week and <3 training days
        │    remain in that first calendar week → 1 uncounted lead-in week
        ├─▶ generatePlan(input) → lib/trainingEngine.ts
        │     ├─ findTemplate(distance, level, trainingGoal) → lib/planTemplates.ts
        │     │     ├─ MATCH  → buildPlanFromTemplate() — exact week-by-week replay
        │     │     │            (intensity scales paces + finish time; distances fixed)
        │     │     └─ NO MATCH → parametric path:
        │     │            ├─ calculatePaces()   — derives pace zones from PR data
        │     │            ├─ generateWeeklyKm()  — weekly km (base→build→peak→taper)
        │     │            └─ assignDaySlots()    — assigns workout types per day
        │     └─ returns GeneratedPlan { weeks[], projectedFinishTime, improvementRange }
        ├─ if leadInWeeks: prepends buildLeadInWeek() as week 0 (isLeadIn)
        ├─ stores plan as JSON in TrainingPlan.planData (MariaDB) + level column
        └─ upserts RunnerProfile with wizard settings (incl. level)

User views plan (/plan/[id])
  └─▶ PlanCalendarView
        └─▶ DayActionSheet (on day tap)
              ├─ generateWorkoutSteps() → lib/workoutSteps.ts (warm-up / main / cool-down steps)
              ├─ getMealsForWorkout()   → lib/mealData.ts (pre/during/post meal suggestions)
              └─ paceToSpeed()          — converts M:SS pace to km/h for treadmill mode

User marks workout done
  └─▶ saveCompletion (app/actions/workout.ts)
        └─ upserts TrainingPlan.planData.completions (JSON patch)
```

---

## lib/trainingEngine.ts — Public API

| Export | Purpose |
|---|---|
| `DISTANCE_CONFIGS` | Config per target distance (km, min/maxWeeks, base/peakKm, longRunMax) |
| `generatePlan(input)` | **Main entry point** — template-backed if `findTemplate()` matches, else parametric; returns `GeneratedPlan` |
| `buildPlanFromTemplate(template, input)` | Replays a static template verbatim; intensity scales paces + finish time; compresses short windows by dropping early base weeks |
| `buildLeadInWeek(input, startDow, firstWeek)` | Builds the uncounted lead-in week (`weekNumber: 0`, `isLeadIn: true`, phase `"เกริ่นนำ"`) for a mid-week start |
| `calculatePaces(input)` | Derives `Record<WorkoutType, string>` pace zones from PR data |
| `generateWeeklyKm(input)` | Weekly km array: base → build → peak → taper progression |
| `assignDaySlots(...)` | Assigns `WorkoutType` to each training day slot |
| `getPhase(weekNum, total)` | Returns `"base" \| "build" \| "peak" \| "taper"` |
| `getRpe(type, phase)` | Returns RPE 0–10 for a workout type + phase combo |
| `getNotes(type, phase, week, zones?)` | Coaching note string; uses HR bpm if `zones` provided |
| `buildDescription(type, dist, pace)` | Human-readable workout description line |
| `getProjectedTime(input)` | Projected finish time + improvement range |
| `parseTimeToSeconds(t)` | Parses `"H:MM:SS"` or `"MM:SS"` → seconds |
| `getDefaultTrainingDays(n)` | Default day indices for n days/week |

### Pace Calculation Logic

```
PR input (pr5k / pr10k / prHalf / prFull)
  └─▶ parseTimeToSeconds() / distance = racePace (sec/km)
        └─▶ validate: 120–1200 sec/km (2:00–20:00/km); else use distance defaults
              └─▶ distance adjustment multiplier (source dist → 10K baseline)
                    └─▶ × intensity modifier (gentle 1.05 → elite 0.94)
                          └─▶ × zone multipliers → clampPace(120–1200 sec)
```

**Zone multipliers** (applied to tempo baseline `r`):

| Zone | Multiplier | Example (r=360s) |
|---|---|---|
| easy | ×1.25 | 7:30/km |
| long | ×1.15 | 6:54/km |
| progressive | ×1.15 | 6:54/km |
| fartlek | ×1.10 | 6:36/km |
| fartlek_rolling | ×1.07 | 6:25/km |
| race_pace | ×1.04 | 6:14/km |
| broken_mile | ×1.02 | 6:08/km |
| tempo | ×1.00 | 6:00/km ← baseline |
| hills | ×0.95 | 5:42/km |
| interval/pyramid/drop_set | ×0.88 | 5:17/km |

### Phase Patterns (workout type rotation per day)

| Phase | 4-day pattern |
|---|---|
| base | easy · progressive · easy · [long] |
| build | easy · pyramid · fartlek_rolling · [long] |
| peak | easy · broken_mile · drop_set · [long] |
| taper | easy · race_pace · progressive · [long] |

Recovery weeks (every 4th in build, last 2 overall): hard types downgraded to easy.

---

## lib/planTemplates.ts — Public API

Static, hand-designed plans that the engine **replays verbatim** (store-and-replay)
instead of computing from formulas. For any `distance × level × goal` with a
reference plan, `generatePlan()` detects a matching template and builds the plan
straight from this data.

| Export | Purpose |
|---|---|
| `findTemplate(distance, level, goal?)` | Lookup by key `` `${distance}_${level}${goal==="endurance"?"_endurance":""}` ``; returns `PlanTemplate` or `undefined` (→ parametric) |
| `PlanTemplate` | `{ distance, level, weeks, daysPerWeek, paces, projectedTime, projectedRange, schedule[] }` |
| `TemplateWeek` | Either legacy `{ quality[], long }` (placed on user's chosen days) or explicit `days[]` (fixed 7-slot weekday layout, 0=Sun…6=Sat) |
| `TemplateWorkout` | `{ type, distanceKm, reps?, repKm?, racePrep?, rollingTerrain?, isRace?, note? }` |
| `TemplatePace` | `{ target, rangeLo?, rangeHi? }` in sec/km (easy/long = "no faster than" limit) |

**Templates today** (both 22 weeks, full_marathon × beginner):
- `full_marathon_beginner` — performance plan (source: `public/Marathon_Training_Plan.xlsx`)
- `full_marathon_beginner_endurance` — injury-safe / no-speed finisher (~8:30/km, weekly cross-training day, fixed 7-day layout)

---

## lib/workoutSteps.ts — Public API

| Export | Purpose |
|---|---|
| `generateWorkoutSteps(type, distance, paces)` | Returns `WorkoutSection[]` (warm-up + main + cool-down) — parametric path |
| `buildTemplateWorkoutSteps(w, paces)` | Builds exact outdoor + treadmill `WorkoutSection[]` for a template workout; stored in `GeneratedDay.detail` (race has no treadmill variant) |
| `speedLabel(pace, treadmill)` | `"7:00/km"` or `"7:00/km (8.6 km/h)"` for treadmill |
| `WorkoutStep` | `{ activity, description, distance?, pace?, duration? }` |
| `WorkoutSection` | `{ key, label, type, steps[], coachNote? }` |

---

## lib/hrZones.ts — Public API

| Export | Purpose |
|---|---|
| `calcMaxHR(age)` | `208 − 0.7 × age` (Tanaka formula) |
| `calcHRZones(age)` | Returns `HRZones` with Zone 1–5 bpm ranges |
| `HRZones` | `{ max, zone1–5: [low, high] }` |

Zones:
- Zone 1: 50–60% maxHR (recovery)
- Zone 2: 60–70% maxHR (aerobic base — easy/long runs)
- Zone 3: 70–80% maxHR (aerobic development)
- Zone 4: 80–90% maxHR (lactate threshold — tempo)
- Zone 5: 90–100% maxHR (VO2max — intervals)

**Used by**: `generatePlan()` → `getNotes()` when `input.age` is set

---

## Database Schema (Prisma / MariaDB)

```
User ──────────────────────── (NextAuth standard)
  ├── Account[]               OAuth accounts
  ├── Session[]               Active sessions
  ├── TrainingPlan[]          Generated plans
  └── RunnerProfile?          One-to-one runner settings

RunnerProfile
  ├── age Int?                Used for HR zone calculation
  ├── targetDistance String   "5k" | "half_marathon" | "trail" | …
  ├── level String            "beginner" | "intermediate" | "advanced" (default beginner)
  ├── daysPerWeek Int
  ├── trainingDays String      JSON array e.g. "[1,3,4,6]"
  ├── longRunDay Int
  ├── sessionTime String       "morning" | "evening" | "both"
  ├── morningZone2 Boolean     Morning Zone 2 run preference (stored, not yet used in engine)
  ├── morningMinutes / eveningMinutes Int
  ├── intensity String         "gentle" | "normal" | "challenging" | "elite"
  ├── terrainType String       "road" | "trail" | "track" | "mixed"
  ├── runMode String           "outdoor" | "treadmill"
  ├── pr5k / pr10k / prHalf / prFull String?  Time strings (MM:SS or H:MM:SS)
  └── plans TrainingPlan[]

TrainingPlan
  ├── name String
  ├── targetDistance String
  ├── level String            "beginner" | "intermediate" | "advanced" (default beginner)
  ├── startDate / raceDate DateTime
  ├── trainingWeeks Int
  ├── projectedTime String?
  ├── planData Json            GeneratedPlan { weeks[], projectedFinishTime, improvementRange }
  └── isActive Boolean
```

---

## Server Actions (app/actions/)

| Action | File | What it does |
|---|---|---|
| `createPlanFromWizard` | plan.ts | Validates (+ level, trainingGoal) → template or parametric plan → prepends lead-in week if mid-week start → saves to DB (incl. level) → upserts profile |
| `updatePlan` | plan.ts | Rename or toggle isActive |
| `deletePlan` | plan.ts | Hard delete (auth-gated) |
| `createPlan` | plan.ts | **Deprecated** — legacy FormData version |
| `upsertProfile` | profile.ts | Update RunnerProfile from ProfileFormDialog (incl. level) |
| `saveCompletion` | workout.ts | Patch planData JSON to record daily workout completion % (`weekNumber ≥ 0`; 0 = lead-in week) |

---

## Key Types (types/index.ts)

| Type | Purpose |
|---|---|
| `TargetDistance` | `"3k_beginner" \| "5k" \| "mini_marathon" \| "half_marathon" \| "full_marathon" \| "ultra_50" \| "ultra_100" \| "trail"` |
| `ExperienceLevel` | `"beginner" \| "intermediate" \| "advanced"` (+ `EXPERIENCE_LEVEL_VALUES` / `_LABELS`) |
| `TrainingGoal` | `"performance" \| "endurance"` — selects a plan variant for the same distance × level (default performance) |
| `WorkoutType` | 16 types: rest, easy, long, tempo, interval, race_pace, recovery, hills, cross_train, fartlek, strides, progressive, pyramid, drop_set, broken_mile, fartlek_rolling |
| `TrainingPhase` | `"base" \| "build" \| "peak" \| "taper"` |
| `GeneratedDay` | `{ type, distance, pace, description, rpe, notes, elevationGain, detail? }` — `detail?: { outdoor, treadmill? }` = store-and-replay steps (template plans) |
| `GeneratedWeek` | `{ weekNumber, phase, totalKm, elevationGain, days[], isLeadIn? }` — `isLeadIn` marks the uncounted lead-in week (weekNumber 0) |
| `GeneratedPlan` | `{ weeks[], projectedFinishTime, improvementRange }` |
| `PlanGenerationInput` | Engine input: distances, level, trainingGoal?, days, PRs, intensity, age?, morningZone2? |
| `WizardFormState` | All 6 wizard steps in one object (incl. level, trainingGoal) |
| `CompletionRecord` | `{ completion: 0–100, note? }` — one per workout day |

---

## Authentication Flow

```
/login (public)
  └─▶ GoogleSignInButton → signIn("google", { callbackUrl: "/dashboard" })
        └─▶ /api/auth/[...nextauth] (NextAuth handler)
              └─▶ Google OAuth → PrismaAdapter creates User + Account in DB
                    └─▶ session cookie set → redirect to /dashboard

Protected routes
  └─▶ (app)/layout.tsx → auth() → if !session redirect("/login")
```

Session user has `id` injected via `session()` callback in `auth.ts`.

---

## Feature Status

| Feature | Status |
|---|---|
| Google Sign-In | ✅ Done |
| Plan Wizard (6 steps) | ✅ Done |
| Experience Levels (beginner/intermediate/advanced) | ✅ Done |
| Training Goals (performance / endurance) | ✅ Done |
| Training Plan Generation (parametric) | ✅ Done |
| Template-backed Plans (store-and-replay) | ✅ Done (full_marathon × beginner) |
| Lead-in Week (mid-week start) | ✅ Done |
| Store-and-replay Workout Detail | ✅ Done (template plans) |
| Calendar View | ✅ Done |
| Workout Step-by-step | ✅ Done |
| Treadmill Mode (speed display) | ✅ Fixed (bug: 124.1→8.6 km/h) |
| Meal Recommendations | ✅ Done |
| HR Zone Coaching Notes | ✅ Done (requires age in RunnerProfile) |
| Workout Completion Tracking | ✅ Done |
| Profile Settings | ✅ Done |
| Morning Zone 2 Runs | 🔲 Stored, not generated yet |
| Trail-specific Workouts | 🔲 Uses generic patterns (pending Google Doc input) |
| Dashboard Stats | 🔲 UI exists, completion aggregation TBD |
