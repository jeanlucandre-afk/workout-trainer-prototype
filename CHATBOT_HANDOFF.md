# Workout App Handoff

This frontend is a mobile-first workout execution app. It receives one structured workout plan from a chatbot, lets the user run that plan in the gym, and publishes a completed session result back to the host page/chatbot.

The frontend should receive structured JSON, not free-form natural language. The chatbot can still explain the plan conversationally, but the UI contract should be a workout object.

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
  "kneeling cable crunch": "/exercises/cable-crunch.png"
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

The profile is currently based on the Andrea Rodriguez case study and includes:

```json
{
  "goal": "Lose 8-10 kg while building definition",
  "timeline": "6 months",
  "schedule": "3 days/week",
  "sessionLength": "60-75 min",
  "trainingStyle": ["Machines", "Dumbbells", "Treadmill walking"],
  "avoid": ["Jumping", "Sprints", "Deep loaded squats"],
  "constraints": ["Runner's knee", "Lower-back discomfort", "Desk job"],
  "baseline": ["Leg press 100 KG x 10", "Hip thrust 70 KG x 10", "RDL 40 KG x 8"],
  "lifestyle": ["5k steps/day", "6.5h sleep", "Moderate-high stress"],
  "nutrition": ["Inconsistent protein", "Weekend overeating", "Stress eating"],
  "motivation": "8/10",
  "confidence": "6/10",
  "mainConcern": "Fear of re-injuring knee"
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

1. Save each image to `public/exercises/[exercise-slug].png`.
2. If generated as one multi-panel image, crop each panel into a separate square PNG first.
3. Keep the dark style and avoid text inside the image.
4. Add aliases to `exerciseImageMap` in `src/main.jsx`.
5. If an exercise has no matching image yet, let it fall back to `public/exercises/exercise-placeholder.svg`.

```js
const exerciseImageMap = {
  "leg press": "/exercises/leg-press.png",
  "hack squat": "/exercises/hack-squat.png"
};
```
