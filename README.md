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
- Signed workout links: `https://workout-trainer-prototype.vercel.app/workout/:sessionId?token=...`
- Signed onboarding links: `https://workout-trainer-prototype.vercel.app/onboarding/:memberId?token=...`

The backend API is `https://ai-personal-trainer-whatsapp-mvp.vercel.app`.
Production uses Vercel rewrites so `/api/*` on this website proxies to that backend.

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

The app has four browser route shapes:

- `/` loads the local demo workout only.
- `/onboarding` loads the local demo onboarding only.
- `/onboarding/:memberId?token=...` exchanges the backend magic token, removes it from the URL, submits onboarding to `/api/onboarding/:memberId/submit`, and redirects to a generated workout session.
- `/workout/:sessionId?token=...` exchanges the backend magic token, removes it from the URL, fetches `/api/workout-sessions/:sessionId`, and renders that member's session JSON.

The route is controlled client-side in `src/main.jsx`. Hosting needs a fallback to `index.html` for browser refreshes and direct links:

- Vercel: `vercel.json`
- Cloudflare Pages: `public/_redirects`

## Backend Integration

The frontend is a thin client. It does not own WhatsApp, AI generation, schedules, memory, or long-term state.

Runtime flow:

1. WhatsApp/backend sends a signed link to `/onboarding/:memberId?token=...` or `/workout/:sessionId?token=...`.
2. The app calls `POST /api/auth/link/exchange` with `credentials: include`.
3. The backend validates expiry and identity, then sets a secure browser session cookie.
4. The app removes `token` from the browser URL.
5. Workout pages call `GET /api/workout-sessions/:sessionId`.
6. Workout actions call `POST /api/workout-sessions/:sessionId/events`.

The app never consumes raw AI output directly. AI output is validated and normalized by the backend before it is exposed as website-safe workout-session JSON.

API base behavior:

- In local dev, requests default to `http://localhost:8787`.
- In production, requests default to the current website origin so Vercel rewrites handle `/api/*`.
- `VITE_API_BASE_URL` can override this for previews or custom environments.

## Production Smoke Tests

Copy `.env.example` to `.env` if you want local defaults, or pass values inline.
Production smokes require `SMOKE_ADMIN_API_KEY` because they create signed demo/onboarding links through protected backend endpoints.

```bash
SMOKE_ADMIN_API_KEY=... npm run smoke:onboarding-production
SMOKE_ADMIN_API_KEY=... npm run smoke:production
SMOKE_ADMIN_API_KEY=... npm run smoke:production-recursive
npm run smoke:link-errors
```

These scripts verify the real deployed backend and website:

- onboarding magic-link exchange
- token stripping
- onboarding profile submission
- profile-to-workout mapping
- workout session fetch
- session opened/started events
- pain-report safety state
- set completion flow
- completed session state
- unauthenticated session blocking
- invalid/missing link messaging

For local convenience when the backend repo sits beside this project, you can source the backend `.env` and pass only the admin key into the smoke:

```bash
set -a
source "/Users/jean-luc1515/Documents/Gym thing/ai-personal-trainer-whatsapp-mvp/.env"
set +a
SMOKE_ADMIN_API_KEY="$ADMIN_API_KEY" npm run smoke:production
```

Do not use these as live WhatsApp proof. They verify web/backend behavior only; live WhatsApp proof is owned by the backend repo's guarded smoke script.

`smoke:production-recursive` runs readiness, onboarding, and workout smokes repeatedly. It defaults to 3 consecutive iterations because that matches the current GO/NO-GO requirement for repeated safe production proof. Set `REQUIRE_SENT_READY=true` when Sent fallback credentials should be enforced as a hard gate.

`smoke:link-errors` does not need admin credentials. It verifies that invalid workout links and missing onboarding tokens show explicit member-facing recovery messages and that bad URL tokens are stripped after failed exchange.

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
- `public/exercises/*.svg` for the expanded 20+ exercise library
- `public/exercises/exercise-placeholder.svg`

To add a new exercise image:

1. Generate a square 1:1 image in the same dark minimalist style.
2. Save it to `public/exercises/[exercise-slug].png`, or update `scripts/generate-exercise-assets.mjs` and run `npm run assets:exercises` for local SVG assets.
3. Add aliases to `exerciseImageMap` in `src/main.jsx`.
4. Keep fallback behavior for exercises without images.

The full image-generation handoff prompt is in [CHATBOT_HANDOFF.md](./CHATBOT_HANDOFF.md).

## Deployment

Vercel:

```bash
npm run build
npx vercel@latest deploy --prod --yes
```

## Notes For The Next Developer

- Keep the frontend as a single-plan executor. Do not add a plan builder/profile manager here unless the product direction changes.
- The chatbot should own plan generation and long-term memory.
- The frontend should stay simple: exchange signed links, fetch session JSON, run the workout, and post events.
- Keep units explicit if adding pounds later. The UI currently assumes KG.
- Add stable `plan.id`, `chatbotRequestId`, and `exercise.id` fields in backend-generated data.
- Validate generated plans in the backend before exposing them to the UI.
