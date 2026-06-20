# Workout App Handoff

This frontend is a mobile-first workout execution app. It receives one structured workout plan from a chatbot, lets the user run that plan in the gym, and publishes a completed session result back to the host page/chatbot.

The frontend should receive structured JSON, not free-form natural language. The chatbot can still explain the plan conversationally, but the UI contract should be a workout object.

## Current App Routes

- `/` shows the generated workout plan and gym execution flow.
- `/onboarding` shows the generic trainer intake flow.

The app is intentionally narrow. It does not create multiple plans, manage a full profile, or replace the chatbot. It is the UI surface for one generated plan at a time.

## Hosting Notes

- Vercel live URL: `https://workout-trainer-prototype.vercel.app/`
- Vercel onboarding URL: `https://workout-trainer-prototype.vercel.app/onboarding`
- Cloudflare Pages project: `workout-trainer-prototype`
- Cloudflare Pages route fallback: `public/_redirects`

Cloudflare deployment was prepared, but the first upload attempt hit Cloudflare API `502 Bad Gateway` responses on `POST /pages/assets/upload`. Retry:

```bash
npm run build
npx wrangler@latest pages deploy dist --project-name workout-trainer-prototype --branch main
```

## Workout Input Shape

Recommended payload:

```json
{
  "id": "chatbot-plan-2026-06-08-001",
  "title": "Lower body + core",
  "source": "AI generated plan",
  "duration": "58 min",
  "focus": "Strength balance",
  "note": "Built for leg strength, controlled lower-back loading, and simple progression.",
  "defaultRest": 75,
  "exercises": [
    {
      "id": "leg-press",
      "name": "Leg Press",
      "muscle": "Legs",
      "cue": "Feet mid-platform. Control the bottom. Do not lock out hard.",
      "rest": 90,
      "image": "/exercises/leg-press.png",
      "sets": [
        { "reps": 10, "weight": 120 },
        { "reps": 10, "weight": 120 },
        { "reps": 8, "weight": 130 }
      ]
    }
  ]
}
```

Required fields:

- `exercises[].name`
- `exercises[].sets[]`
- `sets[].reps`

Recommended fields:

- `id`
- `title`
- `source`
- `duration`
- `focus`
- `note`
- `defaultRest`
- `exercises[].id`
- `exercises[].muscle`
- `exercises[].cue`
- `exercises[].rest`
- `exercises[].weight`
- `exercises[].image`

## Import Methods

The frontend currently accepts a workout through any of these paths:

```js
window.__SETLINE_WORKOUT__ = workoutPlan;
```

```js
localStorage.setItem("setline.workoutPlan", JSON.stringify(workoutPlan));
```

```js
window.dispatchEvent(new CustomEvent("setline:workout", { detail: workoutPlan }));
```

```js
window.postMessage({ type: "setline:workout", payload: workoutPlan });
```

If no external workout is supplied, the app loads the demo lower-body workout so the prototype remains reviewable.

## Normalization Behavior

The app normalizes incoming data before rendering:

- Rejects missing or invalid workout payloads.
- Drops exercises with no `name` or no valid rep-based sets.
- Converts `sets[].reps` and `sets[].weight` to non-negative numbers.
- Keeps only sets with `reps > 0`.
- Uses `exercise.muscle`, then `exercise.group`, then `"Training"`.
- Uses `exercise.cue`, then `exercise.notes`, then a generic controlled-rep cue.
- Uses `exercise.rest`, then `defaultRest`, then `75`.
- Enforces a minimum rest period of `15` seconds.
- Uses supplied `exercise.image` when present.
- Otherwise maps known exercise names to local generated assets.
- Falls back to `/exercises/exercise-placeholder.svg` when no asset exists.

Current image aliases:

```js
{
  "leg press": "/exercises/leg-press.png",
  "hamstring curl": "/exercises/hamstring-curl.png",
  "seated hamstring curl": "/exercises/hamstring-curl.png",
  "lying hamstring curl": "/exercises/hamstring-curl.png",
  "leg curl": "/exercises/hamstring-curl.png",
  "cable crunch": "/exercises/cable-crunch.png",
  "kneeling cable crunch": "/exercises/cable-crunch.png",
  "chest press": "/exercises/chest-press.png",
  "lat pulldown": "/exercises/lat-pulldown.png",
  "seated cable row": "/exercises/seated-cable-row.png",
  "dumbbell romanian deadlift": "/exercises/dumbbell-romanian-deadlift.png",
  "goblet squat to box": "/exercises/goblet-squat-to-box.png",
  "dumbbell floor press": "/exercises/dumbbell-floor-press.png",
  "pallof press": "/exercises/pallof-press.png",
  "side plank": "/exercises/side-plank.png",
  "bike intervals": "/exercises/bike-intervals.png",
  "crosstrainer intervals": "/exercises/crosstrainer-intervals.png",
  "dumbbell shoulder press": "/exercises/dumbbell-shoulder-press.png",
  "dumbbell lateral raise": "/exercises/dumbbell-lateral-raise.png",
  "cable face pull": "/exercises/cable-face-pull.png",
  "dumbbell split squat": "/exercises/dumbbell-split-squat.png",
  "glute bridge": "/exercises/glute-bridge.png",
  "dumbbell bench row": "/exercises/dumbbell-bench-row.png",
  "standing cable triceps pressdown": "/exercises/triceps-pressdown.png",
  "triceps pressdown": "/exercises/triceps-pressdown.png",
  "dumbbell curl": "/exercises/dumbbell-curl.png"
}
```

## Editable Fields

The current UI lets the user edit:

- Weight for each set.
- Reps for each set.
- Rest period for each exercise.

In the workout/rest flow, `EDIT SET` lets the user adjust the active set while the rest timer keeps running.

## Completion Output

When the workout is completed, the frontend publishes a session result through:

```js
window.__SETLINE_SESSION_RESULT__
localStorage.getItem("setline.sessionResult")
window.addEventListener("setline:session-complete", (event) => console.log(event.detail))
```

The result contains:

```json
{
  "workoutId": "chatbot-plan-2026-06-08-001",
  "title": "Lower body + core",
  "completedAt": "2026-06-08T20:00:00.000Z",
  "completedSets": 9,
  "totalSets": 9,
  "totalVolume": 11240,
  "exercises": [
    {
      "name": "Leg Press",
      "muscle": "Legs",
      "rest": 90,
      "completedSets": 3,
      "totalSets": 3,
      "volume": 3800,
      "sets": [
        {
          "set": 1,
          "plannedReps": 10,
          "plannedWeight": 120,
          "reps": 10,
          "weight": 120,
          "completed": true
        }
      ]
    }
  ]
}
```

## Backend Integration Notes

The backend/chatbot should treat the frontend as a single-plan executor:

1. Generate one workout plan.
2. Pass it into the frontend using one import method above.
3. Listen for `setline:session-complete`.
4. Store or summarize the returned result in the chatbot thread.

The onboarding flow now produces a trainer intake profile before the plan screen. When onboarding is completed, the app publishes:

```js
window.__SETLINE_ONBOARDING_PROFILE__
localStorage.getItem("setline.onboardingProfile")
window.addEventListener("setline:onboarding-complete", (event) => console.log(event.detail))
```

The profile is generic and intended to work for any person. It includes body metrics, goals, schedule, pain/injury constraints, equipment access, lifestyle, and motivation:

```json
{
  "age": 28,
  "height": 175,
  "weight": 78,
  "primaryGoal": "Lose fat",
  "goalDetails": ["Build muscle definition", "Improve energy", "Feel confident in the gym"],
  "timeline": "3-6 months",
  "trainingDays": 3,
  "sessionLength": 60,
  "experience": "Some gym experience",
  "trainingStyle": ["Machines", "Dumbbells"],
  "cardioPreference": "Incline walking or cycling",
  "pains": ["Lower back tightness"],
  "pastInjuries": ["No major past injury"],
  "movementsToAvoid": ["High-impact jumping"],
  "equipment": ["Full gym", "Machines", "Dumbbells"],
  "lifestyle": ["Mostly seated work", "Moderate stress"],
  "sleep": 7,
  "motivation": 8,
  "confidence": 6,
  "mainConcern": "Staying consistent"
}
```

In production, the chatbot should use this profile to generate the structured workout JSON. The prototype still loads a demo plan after onboarding so the flow can be reviewed without a backend.

Good future backend additions:

- Add a stable `exercise.id` for every exercise.
- Add a stable `plan.id` or `chatbotRequestId` for every generated plan.
- Store generated exercise images by exercise slug.
- Keep units explicit in backend data if pounds will ever be supported. The current prototype visually assumes KG.
- Validate the plan before injecting it into the frontend so the UI only receives runnable workouts.

## Exercise Image Generation Prompt

Use this prompt to generate one exercise image that matches the current app style:

```text
Create a single square 1:1 exercise demo image for [EXERCISE_NAME] in the exact same style as the Setline generated workout assets: dark charcoal/black premium gym, minimalist Gymshark-inspired, grayscale photography-like render, high contrast, athlete in black training clothes, no text, no logos, no watermark, no bright colors, no decorative glow, rounded-corner composition safe for mobile app cropping.

Show the exercise accurately: [EXERCISE_SPECIFIC_BODY_POSITION_AND_MACHINE_DETAILS]. Keep the full machine, cable, bench, or implement visible enough to identify the movement. Center the athlete, make the key joint positions clear, and keep the image readable as both a circular thumbnail and a full-width workout image.
```

Batch prompt:

```text
Create [N] separate square 1:1 mobile app exercise demo images in one consistent minimalist Gymshark-inspired style: dark charcoal/black premium gym, grayscale photography-like render, high contrast, athlete in black training clothes, no text, no logos, no watermark, no bright colors, no decorative glow. Each image must clearly show the correct exercise form, equipment, and body position. Exercises: [LIST_EXERCISES_WITH_ONE_SENTENCE_FORM_DESCRIPTION_EACH].
```

Asset workflow:

1. For generated bitmap assets, save each image to `public/exercises/[exercise-slug].png`.
2. For local SVG assets, update `scripts/generate-exercise-assets.mjs` and run `npm run assets:exercises`.
3. If generated as one multi-panel image, crop each panel into a separate square image first.
4. Keep the dark style and avoid text inside the image.
5. Add aliases to `exerciseImageMap` in `src/main.jsx`.
6. If an exercise has no matching image yet, let it fall back to `public/exercises/exercise-placeholder.svg`.

```js
const exerciseImageMap = {
  "leg press": "/exercises/leg-press.png",
  "hack squat": "/exercises/hack-squat.png"
};
```
