# Setline Workout Trainer Prototype

Mobile-first workout execution prototype for an AI fitness chatbot.

The chatbot owns the conversation and plan generation. This frontend owns the focused gym experience: show one generated workout plan, let the user review/edit it, run the workout set by set, manage rest timers, and return a completed session result.

## What This App Includes

- Minimal dark gym UI inspired by premium fitness apps.
- Workout plan review screen with expandable exercises and per-exercise demo images.
- Exercise execution flow with large gym-friendly controls.
- Editable set weight/reps and editable rest periods.
- Rest timer that keeps running while editing a set.
- Animated exercise-complete and plan-building states.
- Workout summary/progress sheet during the session.
- Generic onboarding intake at `/onboarding` for body metrics, goals, schedule, pain, injuries, equipment, recovery, and motivation.
- Browser route support for `/` and `/onboarding`.

## Live Routes

- Workout plan and gym app: `https://workout-trainer-prototype.vercel.app/`
- Onboarding intake: `https://workout-trainer-prototype.vercel.app/onboarding`

Cloudflare Pages project was created as `workout-trainer-prototype`, but the first asset upload hit Cloudflare API `502 Bad Gateway` responses on `POST /pages/assets/upload`. The repo already includes the Cloudflare Pages route fallback in `public/_redirects`, so deployment can be retried without code changes.

## Local Development

Requirements:

- Node.js
- npm

Install and run:

```bash
npm install
npm run dev
```

Vite serves the app at:

```text
http://127.0.0.1:5173/
http://127.0.0.1:5173/onboarding
```

Production build:

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

## Project Structure

```text
src/main.jsx                  Main React app, route handling, plan normalization, onboarding, workout flow
src/styles.css                Full visual system and animation styling
public/exercises/             Exercise demo assets used by the workout plan
public/_redirects             Cloudflare Pages SPA fallback
vercel.json                   Vercel SPA rewrites
CHATBOT_HANDOFF.md            Backend/chatbot integration contract and image generation prompt
design-qa.md                  Prior visual QA notes
```

## Routes

The app has two browser routes:

- `/` loads the workout plan and execution app.
- `/onboarding` loads the intake flow.

The route is controlled client-side in `src/main.jsx`. Hosting needs a fallback to `index.html` for browser refreshes and direct links:

- Vercel: `vercel.json`
- Cloudflare Pages: `public/_redirects`

## Chatbot Integration

The frontend expects structured workout JSON, not free-form workout text. The fastest integration path is:

1. The chatbot collects onboarding data from `/onboarding`.
2. The chatbot generates one structured workout plan.
3. The host page injects the workout into the frontend.
4. The frontend emits a completed session result.
5. The chatbot stores or summarizes the result.

Supported workout injection methods:

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

Completion events:

```js
window.addEventListener("setline:onboarding-complete", (event) => {
  console.log(event.detail);
});

window.addEventListener("setline:session-complete", (event) => {
  console.log(event.detail);
});
```

Read the full contract in [CHATBOT_HANDOFF.md](./CHATBOT_HANDOFF.md).

## Minimal Workout Payload

```json
{
  "id": "chatbot-plan-001",
  "title": "Lower body + core",
  "source": "AI generated plan",
  "duration": "58 min",
  "focus": "Strength balance",
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

Weights are displayed as KG in the current UI. Bodyweight sets display as `BW`.

## Exercise Images

Current local generated assets:

- `public/exercises/leg-press.png`
- `public/exercises/hamstring-curl.png`
- `public/exercises/cable-crunch.png`
- `public/exercises/exercise-placeholder.svg`

To add a new exercise image:

1. Generate a square 1:1 image in the same dark minimalist style.
2. Save it to `public/exercises/[exercise-slug].png`.
3. Add aliases to `exerciseImageMap` in `src/main.jsx`.
4. Keep fallback behavior for exercises without images.

The full image-generation handoff prompt is in [CHATBOT_HANDOFF.md](./CHATBOT_HANDOFF.md).

## Deployment

Vercel:

```bash
npm run build
npx vercel@latest deploy --prod --yes
```

Cloudflare Pages:

```bash
npm run build
npx wrangler@latest pages deploy dist --project-name workout-trainer-prototype --branch main
```

Cloudflare setup already done locally:

- Wrangler login completed.
- Pages project created: `workout-trainer-prototype`
- Public Pages domain reserved: `https://workout-trainer-prototype.pages.dev/`

Current Cloudflare blocker:

- Asset upload endpoint returned `502 Bad Gateway`.
- Retry the deploy command above when Cloudflare upload is healthy.

## Notes For The Next Developer

- Keep the frontend as a single-plan executor. Do not add a plan builder/profile manager here unless the product direction changes.
- The chatbot should own plan generation and long-term memory.
- The frontend should stay simple: receive plan, run plan, emit result.
- Keep units explicit if adding pounds later. The UI currently assumes KG.
- Add stable `plan.id`, `chatbotRequestId`, and `exercise.id` fields in backend-generated data.
- Validate generated plans before injecting them into the UI.
