import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Check,
  ChevronLeft,
  Dumbbell,
  Minus,
  Play,
  Plus,
  RefreshCcw,
  SkipForward,
  Timer,
  X,
} from "lucide-react";
import { exchangeMagicToken, loadWorkoutSession, postWorkoutEvent, submitOnboarding } from "./api.js";
import "./styles.css";

const exerciseImageMap = {
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
  "romanian deadlift with dumbbells": "/exercises/dumbbell-romanian-deadlift.png",
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
  "dumbbell curl": "/exercises/dumbbell-curl.png",
};

const fallbackExerciseImage = "/exercises/exercise-placeholder.svg";
const buildPlanStorageKey = "setline.buildingPlan";

function screenFromPath() {
  if (typeof window === "undefined") return "plan";
  return window.location.pathname.startsWith("/onboarding") ? "onboarding" : "plan";
}

function routeForScreen(screen) {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/workout/")) {
    return window.location.pathname;
  }
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/onboarding/")) {
    return window.location.pathname;
  }
  return screen === "onboarding" ? "/onboarding" : "/";
}

function formatWeight(weight) {
  return weight ? `${weight} KG` : "BW";
}

function getRouteMatch(prefix) {
  if (typeof window === "undefined") return null;
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[0] === prefix && parts[1] ? parts[1] : null;
}

function getUrlToken() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("token");
}

function removeTokenFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("token");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function routeErrorMessage(error) {
  if (error?.status === 410) {
    return "This link has expired. Message your coach on WhatsApp for a fresh one.";
  }
  if (error?.status === 400 || error?.status === 404) {
    return "This link is invalid or no longer exists. Message your coach on WhatsApp for a fresh one.";
  }
  if (error?.status === 403) {
    return "This link belongs to another member or workout. Open the latest link from your coach.";
  }
  if (error?.status === 401) {
    return "This link needs a valid WhatsApp login. Open the latest link from your coach.";
  }
  return error instanceof Error ? error.message : "Could not load workout.";
}

const onboardingDefaults = {
  age: 28,
  height: 175,
  weight: 78,
  primaryGoal: [],
  goalDetails: [],
  timeline: "",
  trainingDays: 3,
  availableDays: [],
  sessionLength: 60,
  experience: "",
  trainingStyle: [],
  cardioPreference: "",
  pains: [],
  otherPain: "",
  pastInjuries: [],
  otherInjury: "",
  movementsToAvoid: [],
  equipment: [],
  lifestyle: [],
  stressLevel: "",
  sleep: 7,
  motivation: 8,
  confidence: 6,
  mainConcern: "",
};

const onboardingSteps = [
  {
    eyebrow: "Profile",
    title: "Start with the basics",
    copy: "Height, weight, and age help the coach scale exercise selection, volume, and progress targets.",
    phase: "Body",
    insight: "Your body profile anchors the first training dose.",
    tone: "body",
    type: "metrics",
    metrics: [
      { key: "age", label: "Age", unit: "", min: 13, max: 85, step: 1 },
      { key: "height", label: "Height", unit: "cm", min: 120, max: 220, step: 1 },
      { key: "weight", label: "Weight", unit: "kg", min: 35, max: 220, step: 1 },
    ],
  },
  {
    eyebrow: "Goals",
    title: "What are we training for?",
    copy: "Pick the main outcome first. The extra goals help the chatbot choose the right training emphasis.",
    key: "primaryGoal",
    phase: "Goals",
    insight: "Goals decide the plan bias.",
    tone: "goals",
    type: "multi",
    options: ["Lose fat + build muscle", "Build muscle", "Lose fat", "Improve health and general fitness"],
  },
  {
    eyebrow: "Motivation",
    title: "What else matters?",
    copy: "These are the emotional and practical reasons the plan should support beyond the main goal.",
    key: "goalDetails",
    phase: "Goals",
    insight: "Motivation turns the plan into something worth repeating.",
    tone: "goals",
    type: "multi",
    options: [
      "Build muscle definition",
      "Improve energy",
      "Feel confident in the gym",
      "Reduce pain",
    ],
  },
  {
    eyebrow: "Schedule",
    title: "What can fit your real week?",
    copy: "A plan only works if the weekly frequency and session length are realistic.",
    phase: "Schedule",
    insight: "A realistic week beats a perfect plan that never happens.",
    tone: "schedule",
    type: "metrics",
    metrics: [
      { key: "trainingDays", label: "Days/week", unit: "days", min: 1, max: 7, step: 1 },
      { key: "sessionLength", label: "Session", unit: "min", min: 20, max: 120, step: 5 },
    ],
  },
  {
    eyebrow: "Availability",
    title: "Which days can you train?",
    copy: "The coach will schedule the two-week split onto the exact days you can realistically show up.",
    key: "availableDays",
    phase: "Schedule",
    insight: "Specific days turn a routine into a calendar.",
    tone: "schedule",
    type: "multi",
    options: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  {
    eyebrow: "Training",
    title: "What experience do you have?",
    copy: "This controls exercise complexity, starting intensity, and how much explanation the plan needs.",
    key: "experience",
    phase: "Training",
    insight: "Experience controls how technical the workout should be.",
    tone: "training",
    type: "single",
    options: ["New to fitness", "Some fitness experience", "Consistent for 6+ months", "Advanced"],
  },
  {
    eyebrow: "Preference",
    title: "How do you like to train?",
    copy: "Preferences help the chatbot create a plan the person will actually want to repeat.",
    key: "trainingStyle",
    phase: "Training",
    insight: "Preference is adherence data.",
    tone: "training",
    type: "multi",
    options: ["Machines", "Dumbbells", "Barbells", "Bodyweight"],
    optional: true,
  },
  {
    eyebrow: "Pain",
    title: "Any pain right now?",
    copy: "Current pain changes exercise selection immediately. Select anything the plan should protect.",
    key: "pains",
    phase: "Guardrails",
    insight: "Pain notes become exercise filters.",
    tone: "guardrails",
    type: "multi",
    options: ["No pain", "Knee pain", "Lower back tightness", "Shoulder pain", "Hip pain"],
    textKey: "otherPain",
    textLabel: "Other pain",
    textPlaceholder: "Type any other pain or limitation",
  },
  {
    eyebrow: "Injuries",
    title: "Any past injuries?",
    copy: "Past injuries tell the coach where to be conservative and what movements to avoid early.",
    key: "pastInjuries",
    phase: "Guardrails",
    insight: "Old injuries shape warmups, tempo, and progression.",
    tone: "guardrails",
    type: "multi",
    options: ["No major past injury", "Knee injury", "Back injury", "Shoulder injury", "Ankle injury"],
    textKey: "otherInjury",
    textLabel: "Other injury",
    textPlaceholder: "Type any previous injury the coach should respect",
  },
  {
    eyebrow: "Recovery",
    title: "How much sleep do you get?",
    copy: "Sleep sets the starting intensity and how aggressively the coach can progress volume.",
    phase: "Recovery",
    insight: "Sleep decides how hard the first week should push.",
    tone: "recovery",
    type: "metrics",
    metrics: [{ key: "sleep", label: "Sleep", unit: "h", min: 4, max: 10, step: 0.5 }],
  },
  {
    eyebrow: "Recovery",
    title: "What does your normal day look like?",
    copy: "Work and daily movement help the coach avoid overloading you outside the gym.",
    key: "lifestyle",
    phase: "Recovery",
    insight: "Daily load changes workout load.",
    tone: "recovery",
    type: "multi",
    options: ["Mostly seated work", "Active job", "Low daily steps", "High daily steps"],
  },
  {
    eyebrow: "Recovery",
    title: "How stressful is this season?",
    copy: "Stress changes how much the plan should push intensity and failure sets.",
    key: "stressLevel",
    phase: "Recovery",
    insight: "Stress is training load too.",
    tone: "recovery",
    type: "single",
    options: ["Low stress", "Moderate stress", "High stress"],
  },
  {
    eyebrow: "Mindset",
    title: "How ready do you feel?",
    copy: "Motivation and confidence shape the tone, milestones, and how much support the plan should include.",
    phase: "Mindset",
    insight: "Readiness sets the coaching tone.",
    tone: "mindset",
    type: "metrics",
    metrics: [
      { key: "motivation", label: "Motivation", unit: "/10", min: 1, max: 10, step: 1 },
      { key: "confidence", label: "Confidence", unit: "/10", min: 1, max: 10, step: 1 },
    ],
  },
  {
    eyebrow: "Coach note",
    title: "What should the coach remember?",
    copy: "This gives the chatbot the human reason behind the plan, not only the workout variables.",
    key: "mainConcern",
    phase: "Mindset",
    insight: "This becomes an optional coach note.",
    tone: "mindset",
    type: "text",
    textLabel: "Optional note",
    textPlaceholder: "Example: I hate crowded gyms, keep things simple, avoid public attention",
    optional: true,
  },
];

const demoWorkoutPlan = {
  title: "Lower body + core",
  source: "AI generated plan",
  duration: "58 min",
  focus: "Strength balance",
  note: "Built for leg strength, controlled lower-back loading, and simple progression.",
  exercises: [
    {
      name: "Leg Press",
      sets: [
        { reps: 10, weight: 120 },
        { reps: 10, weight: 120 },
        { reps: 8, weight: 130 },
      ],
      cue: "Feet mid-platform. Control the bottom. Do not lock out hard.",
      muscle: "Legs",
      rest: 90,
      image: "/exercises/leg-press.png",
    },
    {
      name: "Hamstring Curl",
      sets: [
        { reps: 12, weight: 42 },
        { reps: 12, weight: 42 },
        { reps: 10, weight: 46 },
      ],
      cue: "Squeeze the pad down. Pause for one count at the bottom.",
      muscle: "Hamstrings",
      rest: 75,
      image: "/exercises/hamstring-curl.png",
    },
    {
      name: "Cable Crunch",
      sets: [
        { reps: 14, weight: 35 },
        { reps: 14, weight: 35 },
        { reps: 12, weight: 40 },
      ],
      cue: "Ribs down. Curl through the spine instead of pulling with arms.",
      muscle: "Core",
      rest: 60,
      image: "/exercises/cable-crunch.png",
    },
  ],
};

function matchExerciseImage(name, providedImage) {
  if (providedImage) return providedImage;
  const normalizedName = String(name || "").trim().toLowerCase();
  return exerciseImageMap[normalizedName] || fallbackExerciseImage;
}

function valuesFrom(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function normalizePrepList(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      return [item.name, item.duration, item.reps, item.note].filter(Boolean).join(" · ");
    })
    .filter(Boolean);
}

function normalizeWorkoutPlan(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Workout payload is missing.");
  }

  const exercises = Array.isArray(input.exercises)
    ? input.exercises
        .map((exercise, exerciseIndex) => {
          const sets = Array.isArray(exercise.sets)
            ? exercise.sets
                .map((set) => ({
                  reps: Math.max(0, Number(set.reps) || 0),
                  weight: Math.max(0, Number(set.weight) || 0),
                }))
                .filter((set) => set.reps > 0)
            : [];

          if (!exercise.name || sets.length === 0) return null;

          return {
            name: String(exercise.name),
            muscle: String(exercise.muscle || exercise.group || "Training"),
            cue: String(exercise.cue || exercise.notes || "Controlled reps. Keep the movement clean."),
            rest: Math.max(15, Number(exercise.rest) || Number(input.defaultRest) || 75),
            sets,
            image: matchExerciseImage(exercise.name, exercise.image),
            sourceId: exercise.id || `exercise-${exerciseIndex + 1}`,
            substitutions: Array.isArray(exercise.substitutions) ? exercise.substitutions : [],
          };
        })
        .filter(Boolean)
    : [];

  if (exercises.length === 0) {
    return null;
  }

  const warmup = normalizePrepList(input.warmup);
  const cooldown = normalizePrepList(input.cooldown);

  return {
    title: String(input.title || "AI workout"),
    source: String(input.source || "AI generated plan"),
    duration: String(input.duration || `${Math.max(20, exercises.length * 14)} min`),
    focus: String(input.focus || "Generated session"),
    note: String(input.note || "Adjust sets if needed, then start when ready."),
    chatbotRequestId: input.chatbotRequestId || input.id || "demo-workout",
    backendSession: input.backendSession,
    warmup: warmup.length ? warmup : ["5 min easy cardio", "2 light ramp-up sets for the first lift"],
    cooldown: cooldown.length ? cooldown : ["3 min easy walk", "Stretch the trained muscles without forcing range"],
    safetyNotes: normalizePrepList(input.safetyNotes),
    exercises,
  };
}

function parseFirstNumber(value, fallback = 10) {
  const match = String(value || "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function parseLoad(value) {
  const text = String(value || "").toLowerCase();
  const explicit = text.match(/\d+(\.\d+)?/);
  if (explicit) return Number(explicit[0]);
  if (text.includes("body") || text.includes("bw")) return 0;
  return 0;
}

function normalizeBackendWorkoutSession(session) {
  const exercises = Array.isArray(session.exercises)
    ? session.exercises.map((exercise) => {
        const setCount = Math.max(1, Number(exercise.sets) || 1);
        const reps = parseFirstNumber(exercise.reps, 10);
        const weight = parseLoad(exercise.load);
        return {
          id: exercise.exercise_id,
          name: exercise.name,
          muscle: exercise.station || exercise.mode || "Training",
          cue: exercise.note || "Controlled reps. Keep the movement clean.",
          rest: Math.max(15, Number(exercise.rest_seconds) || 75),
          image: String(exercise.image_url || "").startsWith("/assets/") ? undefined : exercise.image_url,
          substitutions: exercise.substitutions || [],
          sets: Array.from({ length: setCount }, () => ({ reps, weight })),
        };
      })
    : [];

  return normalizeWorkoutPlan({
    id: session.session_id,
    title: session.title,
    source: "AI generated plan",
    duration: `${session.duration_minutes || 45} min`,
    focus: session.focus,
    note: [session.rationale, ...(session.safety_notes || [])].filter(Boolean).join(" "),
    defaultRest: 75,
    warmup: session.warmup,
    cooldown: session.cooldown,
    safetyNotes: session.safety_notes,
    exercises,
    backendSession: session,
  });
}

function onboardingPayloadFromProfile(profile) {
  const injuryValues = [
    ...valuesFrom(profile.pains),
    ...valuesFrom(profile.otherPain),
    ...valuesFrom(profile.pastInjuries),
    ...valuesFrom(profile.otherInjury),
  ]
    .filter((item) => item && !String(item).toLowerCase().startsWith("no "));
  const selectedDays = profile.availableDays || [];
  const schedule = selectedDays.length
    ? selectedDays.slice(0, profile.trainingDays || selectedDays.length)
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].slice(0, profile.trainingDays || 3);
  const experience = String(profile.experience || "").toLowerCase();
  const trainingLevel = experience.includes("advanced")
    ? "advanced"
    : experience.includes("consistent") || experience.includes("some")
      ? "intermediate"
      : "beginner";

  return {
    goals: [...valuesFrom(profile.primaryGoal), ...valuesFrom(profile.goalDetails)].filter(Boolean),
    goalDetails: [
      profile.mainConcern,
      profile.timeline,
      profile.stressLevel,
      `Motivation ${profile.motivation}/10`,
      `Confidence ${profile.confidence}/10`,
    ].filter(Boolean).join(". "),
    injuries: injuryValues,
    scheduleDays: schedule.length ? schedule : ["Mon", "Wed", "Fri"],
    scheduleTime: "18:00",
    sessionDurationMinutes: Number(profile.sessionLength) || 55,
    trainingLevel,
    equipmentNoGos: [],
    motivationStyle: profile.mainConcern || "direct but supportive",
    quietHoursStart: "21:00",
    quietHoursEnd: "08:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin",
    consentAccepted: true,
    optionalBodyScan: {
      age: profile.age,
      height_cm: profile.height,
      weight_kg: profile.weight,
      sleep_hours: profile.sleep,
      training_style: profile.trainingStyle,
      available_days: profile.availableDays,
      lifestyle: profile.lifestyle,
      stress_level: profile.stressLevel,
    },
  };
}

function loadWorkoutPayload() {
  if (typeof window === "undefined") return normalizeWorkoutPlan(demoWorkoutPlan);

  const globalPayload = window.__SETLINE_WORKOUT__;
  if (globalPayload) return normalizeWorkoutPlan(globalPayload);

  const savedPayload = window.localStorage.getItem("setline.workoutPlan");
  if (savedPayload) return normalizeWorkoutPlan(JSON.parse(savedPayload));

  return normalizeWorkoutPlan(demoWorkoutPlan);
}

function createSessionResult({ workoutPlan, sessionLog, completed, restDurations }) {
  const exercises = workoutPlan.exercises.map((exercise, exerciseIndex) => {
    const sets = sessionLog[exerciseIndex].map((set, setIndex) => ({
      set: setIndex + 1,
      plannedReps: exercise.sets[setIndex]?.reps ?? set.reps,
      plannedWeight: exercise.sets[setIndex]?.weight ?? set.weight,
      reps: set.reps,
      weight: set.weight,
      completed: Boolean(completed[`${exerciseIndex}-${setIndex}`]),
    }));

    return {
      name: exercise.name,
      muscle: exercise.muscle,
      rest: restDurations[exerciseIndex],
      completedSets: sets.filter((set) => set.completed).length,
      totalSets: sets.length,
      volume: sets.reduce((sum, set) => sum + (set.completed ? set.reps * set.weight : 0), 0),
      sets,
    };
  });

  return {
    workoutId: workoutPlan.chatbotRequestId,
    title: workoutPlan.title,
    completedAt: new Date().toISOString(),
    completedSets: exercises.reduce((sum, exercise) => sum + exercise.completedSets, 0),
    totalSets: exercises.reduce((sum, exercise) => sum + exercise.totalSets, 0),
    totalVolume: exercises.reduce((sum, exercise) => sum + exercise.volume, 0),
    exercises,
  };
}

function publishSessionResult(result) {
  if (typeof window === "undefined") return;
  window.__SETLINE_SESSION_RESULT__ = result;
  window.localStorage.setItem("setline.sessionResult", JSON.stringify(result));
  window.dispatchEvent(new CustomEvent("setline:session-complete", { detail: result }));
}

function publishOnboardingProfile(profile) {
  if (typeof window === "undefined") return;
  window.__SETLINE_ONBOARDING_PROFILE__ = profile;
  window.localStorage.setItem("setline.onboardingProfile", JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent("setline:onboarding-complete", { detail: profile }));
}

function readWorkoutStreak() {
  if (typeof window === "undefined") return { count: 0, lastDate: "" };
  try {
    return JSON.parse(window.localStorage.getItem("setline.workoutStreak") || '{"count":0,"lastDate":""}');
  } catch {
    return { count: 0, lastDate: "" };
  }
}

function updateWorkoutStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const previous = readWorkoutStreak();
  if (previous.lastDate === today) return previous;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const next = {
    count: previous.lastDate === yesterday ? Number(previous.count || 0) + 1 : 1,
    lastDate: today,
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem("setline.workoutStreak", JSON.stringify(next));
  }
  return next;
}

function onboardingStepValue(step, profile) {
  if (step.textKey) return profile[step.textKey];
  if (step.key) return profile[step.key];
  return null;
}

function isOnboardingStepComplete(step, profile) {
  if (!step || step.optional || step.type === "metrics") return true;
  const value = onboardingStepValue(step, profile);
  if (step.type === "text") return Boolean(String(value || "").trim());
  if (step.type === "multi") {
    return valuesFrom(profile[step.key]).length > 0 || Boolean(String(profile[step.textKey] || "").trim());
  }
  return Boolean(value);
}

function onboardingStepError(step) {
  if (step?.type === "multi") return "Pick at least one option or type your answer.";
  if (step?.type === "text") return "Type an answer before continuing.";
  return "Choose an option before continuing.";
}

function App() {
  const screenRef = useRef(null);
  const onboardingBuildTimeoutRef = useRef(null);
  const [workoutState, setWorkoutState] = useState({ status: "loading", workoutPlan: null, error: "" });
  const [screen, setScreen] = useState(screenFromPath);
  const [isBuildingPlan, setIsBuildingPlan] = useState(
    () => typeof window !== "undefined" && window.sessionStorage.getItem(buildPlanStorageKey) === "1",
  );
  const [onboardingComplete, setOnboardingComplete] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingProfile, setOnboardingProfile] = useState(onboardingDefaults);
  const [onboardingError, setOnboardingError] = useState("");
  const [activeExercise, setActiveExercise] = useState(0);
  const [activeSet, setActiveSet] = useState(0);
  const [completed, setCompleted] = useState({});
  const [restSeconds, setRestSeconds] = useState(0);
  const [editReturnScreen, setEditReturnScreen] = useState("rest");
  const [restDurations, setRestDurations] = useState([]);
  const [sessionLog, setSessionLog] = useState([]);
  const [sessionResult, setSessionResult] = useState(null);
  const [coachNotice, setCoachNotice] = useState("");
  const [workoutStreak, setWorkoutStreak] = useState(() => readWorkoutStreak());

  const workoutPlan = workoutState.workoutPlan;

  useEffect(() => {
    function handlePopState() {
      setScreen(screenFromPath());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const nextPath = routeForScreen(screen);
    if (window.location.pathname !== nextPath) {
      window.history.replaceState(null, "", nextPath);
    }
  }, [screen]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const workoutSessionId = getRouteMatch("workout");
        const onboardingMemberId = getRouteMatch("onboarding");
        const token = getUrlToken();

        if (workoutSessionId) {
          if (token) {
            try {
              await exchangeMagicToken(token, workoutSessionId);
            } finally {
              removeTokenFromUrl();
            }
          }
          const session = await loadWorkoutSession(workoutSessionId);
          if (cancelled) return;
          const loadedPlan = normalizeBackendWorkoutSession(session);
          setWorkoutState({ status: "ready", workoutPlan: loadedPlan, error: "" });
          setRestDurations(loadedPlan.exercises.map((exercise) => exercise.rest));
          setSessionLog(loadedPlan.exercises.map((exercise) => exercise.sets.map((set) => ({ ...set }))));
          postWorkoutEvent(workoutSessionId, "session_opened", { source: "workout-trainer-prototype" }).catch((error) => {
            console.warn("Could not sync session_opened", error);
          });
          return;
        }

        if (onboardingMemberId) {
          if (!token) {
            throw Object.assign(new Error("Missing onboarding token"), { status: 401 });
          }
          try {
            await exchangeMagicToken(token);
          } finally {
            removeTokenFromUrl();
          }
        }

        const loadedPlan = loadWorkoutPayload();
        if (cancelled) return;
        if (!loadedPlan) {
          setWorkoutState({ status: "empty", workoutPlan: null, error: "" });
          return;
        }
        setWorkoutState({ status: "ready", workoutPlan: loadedPlan, error: "" });
        setRestDurations(loadedPlan.exercises.map((exercise) => exercise.rest));
        setSessionLog(loadedPlan.exercises.map((exercise) => exercise.sets.map((set) => ({ ...set }))));
      } catch (error) {
        if (cancelled) return;
        setWorkoutState({
          status: "error",
          workoutPlan: null,
          error: routeErrorMessage(error),
        });
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => () => window.clearTimeout(onboardingBuildTimeoutRef.current), []);

  useEffect(() => {
    if (!isBuildingPlan) return undefined;
    if (getRouteMatch("onboarding")) return undefined;
    window.clearTimeout(onboardingBuildTimeoutRef.current);
    onboardingBuildTimeoutRef.current = window.setTimeout(() => {
      publishOnboardingProfile(onboardingProfile);
      window.sessionStorage.removeItem(buildPlanStorageKey);
      setOnboardingComplete({ nextAction: "return_to_whatsapp" });
      setScreen("onboarding");
      setIsBuildingPlan(false);
    }, 3200);
    return () => window.clearTimeout(onboardingBuildTimeoutRef.current);
  }, [isBuildingPlan, onboardingProfile]);

  useEffect(() => {
    function applyIncomingWorkout(payload) {
      try {
        const loadedPlan = normalizeWorkoutPlan(payload);
        if (!loadedPlan) {
          setWorkoutState({ status: "empty", workoutPlan: null, error: "" });
          return;
        }
        setWorkoutState({ status: "ready", workoutPlan: loadedPlan, error: "" });
        setRestDurations(loadedPlan.exercises.map((exercise) => exercise.rest));
        setSessionLog(loadedPlan.exercises.map((exercise) => exercise.sets.map((set) => ({ ...set }))));
        setCompleted({});
        setSessionResult(null);
        setActiveExercise(0);
        setActiveSet(0);
        setCoachNotice("");
        setScreen("plan");
      } catch (error) {
        setWorkoutState({
          status: "error",
          workoutPlan: null,
          error: error instanceof Error ? error.message : "Could not load workout.",
        });
      }
    }

    function handleWorkoutEvent(event) {
      applyIncomingWorkout(event.detail);
    }

    function handleWorkoutMessage(event) {
      if (event.data?.type === "setline:workout") {
        applyIncomingWorkout(event.data.payload);
      }
    }

    window.addEventListener("setline:workout", handleWorkoutEvent);
    window.addEventListener("message", handleWorkoutMessage);

    return () => {
      window.removeEventListener("setline:workout", handleWorkoutEvent);
      window.removeEventListener("message", handleWorkoutMessage);
    };
  }, []);

  function resetToDemoWorkout() {
    const loadedPlan = normalizeWorkoutPlan(demoWorkoutPlan);
    setWorkoutState({ status: "ready", workoutPlan: loadedPlan, error: "" });
    setRestDurations(loadedPlan.exercises.map((exercise) => exercise.rest));
    setSessionLog(loadedPlan.exercises.map((exercise) => exercise.sets.map((set) => ({ ...set }))));
    setCompleted({});
    setSessionResult(null);
    setActiveExercise(0);
    setActiveSet(0);
    setCoachNotice("");
    setScreen("plan");
  }

  const displayedPlan = workoutPlan || normalizeWorkoutPlan(demoWorkoutPlan);
  const current = displayedPlan.exercises[activeExercise];
  const currentSet = sessionLog[activeExercise]?.[activeSet] || current.sets[activeSet];
  const currentRest = restDurations[activeExercise] ?? current.rest;
  const totalSets = displayedPlan.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const completedSets = Object.keys(completed).length;
  const progress = Math.round((completedSets / totalSets) * 100);
  const allDone = completedSets === totalSets;

  useEffect(() => {
    screenRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [screen, activeExercise]);

  useEffect(() => {
    if (!["rest", "exerciseDone", "restEdit"].includes(screen) || restSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setRestSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [screen, restSeconds]);

  const nextTarget = useMemo(() => {
    if (activeSet < current.sets.length - 1) {
      return { exercise: activeExercise, set: activeSet + 1 };
    }
    if (activeExercise < displayedPlan.exercises.length - 1) {
      return { exercise: activeExercise + 1, set: 0 };
    }
    return null;
  }, [activeExercise, activeSet, current.sets.length, displayedPlan.exercises.length]);

  function updateSet(field, delta) {
    updatePlannedSet(activeExercise, activeSet, field, delta);
  }

  function updatePlannedSet(exerciseIndex, setIndex, field, delta) {
    setSessionLog((previous) =>
      previous.map((exerciseSets, currentExerciseIndex) =>
        currentExerciseIndex !== exerciseIndex
          ? exerciseSets
          : exerciseSets.map((set, currentSetIndex) =>
              currentSetIndex !== setIndex
                ? set
                : { ...set, [field]: Math.max(0, set[field] + delta) },
            ),
      ),
    );
  }

  function startWorkout(index = 0) {
    setActiveExercise(index);
    setActiveSet(0);
    setCoachNotice("");
    sendWorkoutEvent("session_started", { exercise_index: index });
    setScreen("workout");
  }

  function logSet() {
    setCompleted((previous) => ({ ...previous, [`${activeExercise}-${activeSet}`]: true }));
    sendWorkoutEvent("set_completed", {
      exercise_index: activeExercise,
      exercise_name: current.name,
      set_index: activeSet,
      reps: currentSet.reps,
      weight: currentSet.weight,
    });
    setRestSeconds(currentRest);
    if (nextTarget && nextTarget.exercise !== activeExercise) {
      setScreen("exerciseDone");
      return;
    }
    setScreen("rest");
  }

  function updateRest(exerciseIndex, delta) {
    setRestDurations((previous) =>
      previous.map((rest, index) => (index === exerciseIndex ? Math.max(15, rest + delta) : rest)),
    );
  }

  function continueAfterRest() {
    if (!nextTarget) {
      const result = createSessionResult({ workoutPlan: displayedPlan, sessionLog, completed, restDurations });
      setSessionResult(result);
      publishSessionResult(result);
      setWorkoutStreak(updateWorkoutStreak());
      sendWorkoutEvent("session_completed", result);
      setScreen("complete");
      return;
    }
    setActiveExercise(nextTarget.exercise);
    setActiveSet(nextTarget.set);
    setScreen("workout");
  }

  function updateOnboardingValue(key, value, type) {
    setOnboardingError("");
    setOnboardingProfile((previous) => {
      if (type !== "multi") {
        return { ...previous, [key]: value };
      }
      const currentValues = previous[key] || [];
      let nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      if (key === "pains" && value === "No pain" && !currentValues.includes(value)) {
        nextValues = ["No pain"];
      } else if (key === "pains" && value !== "No pain") {
        nextValues = nextValues.filter((item) => item !== "No pain");
      }
      if (key === "pastInjuries" && value === "No major past injury" && !currentValues.includes(value)) {
        nextValues = ["No major past injury"];
      } else if (key === "pastInjuries" && value !== "No major past injury") {
        nextValues = nextValues.filter((item) => item !== "No major past injury");
      }
      return { ...previous, [key]: nextValues };
    });
  }

  function updateOnboardingMetric(metric, delta) {
    setOnboardingError("");
    setOnboardingProfile((previous) => {
      const currentValue = Number(previous[metric.key]) || 0;
      const nextValue = Math.min(metric.max, Math.max(metric.min, currentValue + delta));
      return { ...previous, [metric.key]: nextValue };
    });
  }

  function nextOnboardingStep() {
    if (onboardingStep < onboardingSteps.length) {
      const step = onboardingSteps[onboardingStep];
      if (!isOnboardingStepComplete(step, onboardingProfile)) {
        setOnboardingError(onboardingStepError(step));
        return;
      }
      setOnboardingError("");
      setOnboardingStep((value) => value + 1);
      return;
    }
    const onboardingMemberId = getRouteMatch("onboarding");
    if (onboardingMemberId) {
      setIsBuildingPlan(true);
      submitOnboarding(onboardingMemberId, onboardingPayloadFromProfile(onboardingProfile))
        .then((result) => {
          publishOnboardingProfile(onboardingProfile);
          window.clearTimeout(onboardingBuildTimeoutRef.current);
          onboardingBuildTimeoutRef.current = window.setTimeout(() => {
            window.sessionStorage.removeItem(buildPlanStorageKey);
            setOnboardingComplete({
              workoutSessionId: result?.workoutSessionId,
              nextAction: result?.nextAction || "return_to_whatsapp",
            });
            setIsBuildingPlan(false);
          }, 2600);
        })
        .catch((error) => {
          setIsBuildingPlan(false);
          setWorkoutState({
            status: "error",
            workoutPlan: null,
            error: error instanceof Error ? error.message : "Could not submit onboarding.",
          });
        });
      return;
    }
    window.sessionStorage.setItem(buildPlanStorageKey, "1");
    setIsBuildingPlan(true);
  }

  function previousOnboardingStep() {
    setOnboardingError("");
    if (onboardingStep > 0) {
      setOnboardingStep((value) => value - 1);
    }
  }

  function sendWorkoutEvent(eventType, payload = {}) {
    const sessionId = displayedPlan.backendSession?.session_id;
    if (!sessionId) return;
    postWorkoutEvent(sessionId, eventType, { ...payload, source: "workout-trainer-prototype" }).catch((error) => {
      console.warn(`Could not sync ${eventType}`, error);
    });
  }

  function reportPain() {
    sendWorkoutEvent("pain_reported", {
      exercise_index: activeExercise,
      exercise_name: current.name,
      set_index: activeSet,
    });
    setWorkoutState((previous) => ({
      ...previous,
      workoutPlan: previous.workoutPlan
        ? {
            ...previous.workoutPlan,
            backendSession: {
              ...previous.workoutPlan.backendSession,
              safety_state: "human_escalation",
            },
          }
        : previous.workoutPlan,
    }));
  }

  function moveToNextExercise() {
    if (activeExercise < displayedPlan.exercises.length - 1) {
      setActiveExercise((value) => value + 1);
      setActiveSet(0);
      setCoachNotice("");
      setScreen("workout");
      return;
    }
    const result = createSessionResult({ workoutPlan: displayedPlan, sessionLog, completed, restDurations });
    setSessionResult(result);
    publishSessionResult(result);
    setWorkoutStreak(updateWorkoutStreak());
    sendWorkoutEvent("session_completed", result);
    setScreen("complete");
  }

  function skipExercise() {
    sendWorkoutEvent("exercise_skipped", {
      exercise_index: activeExercise,
      exercise_name: current.name,
    });
    moveToNextExercise();
  }

  function requestSubstitution() {
    const substitution = current.substitutions?.[0];
    sendWorkoutEvent("substitution_requested", {
      exercise_index: activeExercise,
      exercise_name: current.name,
      requested_reason: "member_requested_swap",
    });

    if (!substitution) {
      setCoachNotice("Swap requested. If you need a different movement now, message the coach in WhatsApp.");
      return;
    }

    const nextName = typeof substitution === "string" ? substitution : substitution.name || substitution.exercise || "";
    if (!nextName) {
      setCoachNotice("Swap requested. If you need a different movement now, message the coach in WhatsApp.");
      return;
    }

    const nextCue =
      typeof substitution === "string"
        ? `Use this swap instead of ${current.name}. Keep the same sets and stop if it feels wrong.`
        : substitution.note || substitution.reason || `Use this swap instead of ${current.name}. Keep the same sets.`;

    setWorkoutState((previous) => ({
      ...previous,
      workoutPlan: previous.workoutPlan
        ? {
            ...previous.workoutPlan,
            exercises: previous.workoutPlan.exercises.map((exercise, index) =>
              index === activeExercise
                ? {
                    ...exercise,
                    name: nextName,
                    cue: nextCue,
                    image: matchExerciseImage(nextName, substitution.image_url || substitution.image),
                    substitutions: [],
                  }
                : exercise,
            ),
          }
        : previous.workoutPlan,
    }));
    setCoachNotice(`Swapped ${current.name} for ${nextName}. Same set target, cleaner fit.`);
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <section ref={screenRef} className={`screen focused-screen screen-${screen}`}>
          {workoutState.status === "loading" && <LoadingState />}
          {workoutState.status === "error" && (
            <ErrorState message={workoutState.error} onRetry={resetToDemoWorkout} />
          )}
          {workoutState.status === "empty" && <EmptyState onLoadDemo={resetToDemoWorkout} />}
          {workoutState.status === "ready" && screen === "onboarding" && (
            onboardingComplete ? (
              <OnboardingReturnScreen profile={onboardingProfile} result={onboardingComplete} />
            ) : (
              <OnboardingScreen
                stepIndex={onboardingStep}
                profile={onboardingProfile}
                updateValue={updateOnboardingValue}
                updateMetric={updateOnboardingMetric}
                nextStep={nextOnboardingStep}
                previousStep={previousOnboardingStep}
                error={onboardingError}
              />
            )
          )}
          {workoutState.status === "ready" && screen === "plan" && (
            <PlanScreen
              workoutPlan={displayedPlan}
              onboardingProfile={onboardingProfile}
              completedSets={completedSets}
              totalSets={totalSets}
              progress={progress}
              sessionLog={sessionLog}
              restDurations={restDurations}
              updatePlannedSet={updatePlannedSet}
              updateRest={updateRest}
              startWorkout={startWorkout}
              workoutStreak={workoutStreak}
            />
          )}
          {workoutState.status === "ready" && screen === "workout" && (
            <WorkoutScreen
              workoutPlan={displayedPlan}
              current={current}
              currentSet={currentSet}
              activeExercise={activeExercise}
              activeSet={activeSet}
              completed={completed}
              completedSets={completedSets}
              totalSets={totalSets}
              progress={progress}
              updateSet={updateSet}
              setActiveSet={setActiveSet}
              reportPain={reportPain}
              skipExercise={skipExercise}
              requestSubstitution={requestSubstitution}
              coachNotice={coachNotice}
              logSet={logSet}
              setScreen={setScreen}
            />
          )}
          {workoutState.status === "ready" && screen === "rest" && (
            <RestScreen
              workoutPlan={displayedPlan}
              current={current}
              activeExercise={activeExercise}
              activeSet={activeSet}
              completed={completed}
              completedSets={completedSets}
              totalSets={totalSets}
              progress={progress}
              currentRest={currentRest}
              restSeconds={restSeconds}
              nextTarget={nextTarget}
              continueAfterRest={continueAfterRest}
              onEditSet={() => {
                setEditReturnScreen("rest");
                setScreen("restEdit");
              }}
              setScreen={setScreen}
            />
          )}
          {workoutState.status === "ready" && screen === "restEdit" && (
            <WorkoutScreen
              workoutPlan={displayedPlan}
              current={current}
              currentSet={currentSet}
              activeExercise={activeExercise}
              activeSet={activeSet}
              completed={completed}
              completedSets={completedSets}
              totalSets={totalSets}
              progress={progress}
              restSeconds={restSeconds}
              editingMode
              updateSet={updateSet}
              setActiveSet={setActiveSet}
              onSaveEdit={() => setScreen(editReturnScreen)}
              reportPain={reportPain}
              skipExercise={skipExercise}
              requestSubstitution={requestSubstitution}
              coachNotice={coachNotice}
              logSet={logSet}
              setScreen={setScreen}
            />
          )}
          {workoutState.status === "ready" && screen === "exerciseDone" && (
            <ExerciseDoneScreen
              workoutPlan={displayedPlan}
              current={current}
              activeExercise={activeExercise}
              activeSet={activeSet}
              completed={completed}
              completedSets={completedSets}
              totalSets={totalSets}
              progress={progress}
              currentRest={currentRest}
              restSeconds={restSeconds}
              nextTarget={nextTarget}
              continueAfterRest={continueAfterRest}
              onEditSet={() => {
                setEditReturnScreen("exerciseDone");
                setScreen("restEdit");
              }}
              setScreen={setScreen}
            />
          )}
          {workoutState.status === "ready" && screen === "complete" && (
            <CompleteScreen
              sessionResult={sessionResult}
              completedSets={completedSets}
              totalSets={totalSets}
              allDone={allDone}
            />
          )}
          {workoutState.status === "ready" && isBuildingPlan && (
            <PlanBuildScreen profile={onboardingProfile} />
          )}
        </section>
      </div>
    </main>
  );
}

function OnboardingScreen({
  stepIndex,
  profile,
  updateValue,
  updateMetric,
  nextStep,
  previousStep,
  error,
}) {
  const isSummary = stepIndex >= onboardingSteps.length;
  const step = onboardingSteps[Math.min(stepIndex, onboardingSteps.length - 1)];
  const progress = `${Math.round(((stepIndex + 1) / (onboardingSteps.length + 1)) * 100)}%`;
  const selected = step.key ? profile[step.key] : null;
  const phaseLabel = isSummary ? "Trainer brief" : step.phase;
  const phaseSteps = onboardingSteps.filter((item) => item.phase === step.phase);
  const phaseStepIndex = phaseSteps.findIndex((item) => item === step);
  const phaseStepNumber = Math.max(1, phaseStepIndex + 1);
  const phaseBlockLabel = phaseSteps.length === 1 ? "block" : "blocks";
  const phaseBlockName = phaseLabel.toLowerCase().replace(/s$/, "");

  if (isSummary) {
    return (
      <div className="page onboarding-page onboarding-summary">
        <header className="onboarding-top onboarding-logo-top">
          <BrandMark />
        </header>

        <section className="onboarding-hero reveal">
          <span>Trainer brief</span>
          <h1>Ready to build the plan</h1>
          <p>Use this profile to generate a specific plan with realistic volume, guardrails, and motivation.</p>
        </section>

        <section className="brief-card reveal">
          <article>
            <span>Goal</span>
            <strong>{joinText([...valuesFrom(profile.primaryGoal), ...valuesFrom(profile.goalDetails)])}</strong>
          </article>
          <article>
            <span>Body profile</span>
            <strong>{profile.height} cm · {profile.weight} KG · {profile.age} years</strong>
          </article>
          <article>
            <span>Training setup</span>
            <strong>{profile.trainingDays} days/week · {profile.sessionLength} min · {listText(profile.availableDays)}</strong>
          </article>
          <article>
            <span>Guardrails</span>
            <strong>{listText([...valuesFrom(profile.pains), profile.otherPain, ...valuesFrom(profile.pastInjuries), profile.otherInjury])}</strong>
          </article>
          <article>
            <span>Mindset</span>
            <strong>{joinText([profile.mainConcern, profile.stressLevel, `Motivation ${profile.motivation}/10`, `Confidence ${profile.confidence}/10`])}</strong>
          </article>
        </section>

        <OnboardingFooter
          current={onboardingSteps.length + 1}
          total={onboardingSteps.length + 1}
          progress={progress}
          onBack={previousStep}
          onNext={nextStep}
          nextLabel="Build plan"
          phase={phaseLabel}
        />
      </div>
    );
  }

  return (
    <div className={`page onboarding-page onboarding-${step.tone}`}>
      <header className="onboarding-top onboarding-logo-top">
        <BrandMark />
      </header>

      <section className="profile-builder-card reveal" key={`${step.phase}-${stepIndex}`}>
        <strong>
          {phaseStepNumber}/{phaseSteps.length} {phaseBlockName} {phaseBlockLabel}
        </strong>
        <div
          className="builder-dots"
          style={{ gridTemplateColumns: `repeat(${phaseSteps.length}, 1fr)` }}
          aria-hidden="true"
        >
          {phaseSteps.map((item, index) => (
            <i
              className={`${index < phaseStepNumber ? "filled" : ""} ${index + 1 === phaseStepNumber ? "current" : ""}`}
              key={`${item.phase}-${index}`}
            />
          ))}
        </div>
      </section>

      <section className="onboarding-hero reveal" key={step.title}>
        <span>{step.eyebrow}</span>
        <h1>{step.title}</h1>
        <p>{step.copy}</p>
      </section>

      {step.metrics && (
        <section className="metric-stack reveal">
          {step.metrics.map((metric) => (
            <OnboardingMetric
              key={metric.key}
              metric={metric}
              value={profile[metric.key]}
              updateMetric={updateMetric}
            />
          ))}
        </section>
      )}

      {step.options && (
        <ChoiceStack
          options={step.options}
          selected={selected}
          selectionType={step.type}
          tone={step.tone}
          onSelect={(option) => updateValue(step.key, option, step.type)}
        />
      )}

      {(step.type === "text" || step.textKey) && (
        <OnboardingTextInput
          label={step.textLabel || step.title}
          placeholder={step.textPlaceholder}
          value={profile[step.textKey || step.key] || ""}
          onChange={(value) => updateValue(step.textKey || step.key, value, "text")}
        />
      )}

      {step.followUp && (
        <div className="follow-up-group reveal">
          <span>Also important</span>
          <ChoiceStack
            options={step.followUp.options}
            selected={profile[step.followUp.key]}
            selectionType="multi"
            tone={step.tone}
            onSelect={(option) => updateValue(step.followUp.key, option, "multi")}
          />
        </div>
      )}

      <OnboardingFooter
        current={stepIndex + 1}
        total={onboardingSteps.length + 1}
        progress={progress}
        onBack={previousStep}
        onNext={nextStep}
        nextLabel="Next"
        phase={phaseLabel}
        error={error}
      />
    </div>
  );
}

function OnboardingTextInput({ label, placeholder, value, onChange }) {
  return (
    <label className="onboarding-text-input reveal">
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder || "Type here"}
        rows={3}
      />
    </label>
  );
}

function ChoiceStack({ options, selected, selectionType, tone, onSelect }) {
  return (
    <section className={`choice-stack choice-${tone || "default"} reveal`}>
      {options.map((option) => {
        const active = Array.isArray(selected) ? selected.includes(option) : selected === option;
        return (
          <button
            className={`choice-card ${active ? "selected" : ""}`}
            key={option}
            onClick={() => onSelect(option, selectionType)}
          >
            <span>{option}</span>
            <i>{active ? <Check size={20} /> : null}</i>
          </button>
        );
      })}
    </section>
  );
}

function PlanBuildScreen({ profile }) {
  const buildSummary = joinText([
    ...valuesFrom(profile.primaryGoal),
    `${profile.trainingDays} days/week`,
    profile.mainConcern,
  ]);

  return (
    <div className="page build-plan-page">
      <header className="onboarding-top onboarding-logo-top">
        <BrandMark />
      </header>

      <section className="build-stage" aria-label="Building trainer plan">
        <div className="build-constellation" aria-hidden="true">
          <span className="build-chip build-chip-1">Body</span>
          <span className="build-chip build-chip-2">Goals</span>
          <span className="build-chip build-chip-3">Schedule</span>
          <span className="build-chip build-chip-4">Guardrails</span>
          <span className="build-chip build-chip-5">Recovery</span>
        </div>

        <div className="build-core">
          <div className="build-ring build-ring-one" />
          <div className="build-ring build-ring-two" />
          <div className="build-pulse">
            <Dumbbell size={36} />
            <Check className="build-check" size={24} />
          </div>
        </div>

        <div className="build-copy">
          <span>Generating trainer plan</span>
          <h1>Plan taking shape</h1>
          <p>{buildSummary}</p>
        </div>
      </section>

      <section className="build-stack">
        <article>
          <i />
          <span>Profile interpreted</span>
        </article>
        <article>
          <i />
          <span>Guardrails applied</span>
        </article>
        <article>
          <i />
          <span>Workout ready</span>
        </article>
      </section>
    </div>
  );
}

function OnboardingReturnScreen({ profile, result }) {
  const summary = joinText([
    ...valuesFrom(profile.primaryGoal),
    `${profile.trainingDays} days/week`,
    result?.workoutSessionId ? "Workout built" : "Profile saved",
  ]);

  return (
    <div className="page onboarding-return-page">
      <header className="onboarding-top onboarding-logo-top">
        <BrandMark />
      </header>

      <section className="return-stage" aria-label="Onboarding complete">
        <div className="return-mark">
          <Dumbbell size={34} />
          <Check size={22} />
        </div>
        <div className="return-copy">
          <span>Workout ready</span>
          <h1>Go back to WhatsApp</h1>
          <p>{summary}</p>
        </div>
      </section>

      <section className="return-stack">
        <article>
          <span>1</span>
          <strong>Open your WhatsApp chat</strong>
        </article>
        <article>
          <span>2</span>
          <strong>Text Ready to get your week</strong>
        </article>
        <article>
          <span>3</span>
          <strong>Text Gym or Jim when you want to train</strong>
        </article>
      </section>
    </div>
  );
}

function OnboardingMetric({ metric, value, updateMetric }) {
  return (
    <article className="onboarding-metric">
      <span>{metric.label}</span>
      <div>
        <button onClick={() => updateMetric(metric, -metric.step)} aria-label={`Decrease ${metric.label}`}>
          <Minus size={22} />
        </button>
        <strong className="value-readout">
          <AnimatedValue value={value} unit={metric.unit} />
        </strong>
        <button onClick={() => updateMetric(metric, metric.step)} aria-label={`Increase ${metric.label}`}>
          <Plus size={22} />
        </button>
      </div>
    </article>
  );
}

function listText(items) {
  return items?.filter(Boolean).length ? items.filter(Boolean).join(" · ") : "None";
}

function joinText(items) {
  return listText(items);
}

function OnboardingFooter({ current, total, progress, onBack, onNext, nextLabel, phase, error }) {
  return (
    <footer className="onboarding-footer">
      {error && <div className="onboarding-error">{error}</div>}
      <div className="onboarding-progress" aria-hidden="true">
        <i style={{ width: progress }} />
      </div>
      <button className="text-action" onClick={onBack}>
        Back
      </button>
      <strong>
        <span>{phase}</span>
        {current}/{total}
      </strong>
      <button className="text-action next" onClick={onNext}>
        {nextLabel}
      </button>
    </footer>
  );
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-label="Setline">
      <Dumbbell size={20} />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="page integration-state">
      <header className="top-row plan-top-row">
        <BrandMark />
        <div className="plan-chip">Loading</div>
      </header>
      <section className="integration-panel reveal">
        <span>Chatbot handoff</span>
        <h1>Building workout</h1>
        <p>Reading the structured plan and preparing the gym view.</p>
        <div className="skeleton-stack" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </section>
    </div>
  );
}

function EmptyState({ onLoadDemo }) {
  return (
    <div className="page integration-state">
      <header className="top-row plan-top-row">
        <BrandMark />
        <div className="plan-chip">No plan</div>
      </header>
      <section className="integration-panel reveal">
        <span>Waiting for workout</span>
        <h1>No plan yet</h1>
        <p>The chatbot can send a workout JSON payload when it is ready.</p>
        <button className="primary-action" onClick={onLoadDemo}>
          LOAD DEMO PLAN
        </button>
      </section>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="page integration-state">
      <header className="top-row plan-top-row">
        <BrandMark />
        <div className="plan-chip">Error</div>
      </header>
      <section className="integration-panel reveal">
        <span>Workout link issue</span>
        <h1>Open a fresh link</h1>
        <p>{message || "The chatbot response could not be converted into a workout."}</p>
        <button className="primary-action" onClick={onRetry}>
          LOAD DEMO PLAN
        </button>
      </section>
    </div>
  );
}

function PlanScreen({
  workoutPlan,
  onboardingProfile,
  completedSets,
  totalSets,
  progress,
  sessionLog,
  restDurations,
  updatePlannedSet,
  updateRest,
  startWorkout,
  workoutStreak,
}) {
  const [expandedExercise, setExpandedExercise] = useState(-1);
  const averageRest = Math.round(restDurations.reduce((sum, rest) => sum + rest, 0) / restDurations.length);

  return (
    <div className="page single-plan-page">
      <header className="top-row plan-top-row">
        <BrandMark />
        <div className="plan-chip">{workoutPlan.source}</div>
      </header>

      <section className="plan-hero reveal">
        <span>{workoutPlan.focus}</span>
        <h1>{workoutPlan.title}</h1>
        <p>{workoutPlan.duration} · {workoutPlan.exercises.length} exercises · {totalSets} sets</p>
      </section>

      <section className="plan-stat-strip reveal" aria-label="Workout plan stats">
        <article>
          <span>Time</span>
          <strong>{workoutPlan.duration}</strong>
        </article>
        <article>
          <span>Work</span>
          <strong>{workoutPlan.exercises.length} moves</strong>
        </article>
        <article>
          <span>Rest</span>
          <strong>{averageRest}s avg</strong>
        </article>
        <article>
          <span>Streak</span>
          <strong>{workoutStreak.count || 0} days</strong>
        </article>
      </section>

      <section className="hero-card compact-card reveal">
        <div>
          <span className="overline">Session</span>
          <h2>{completedSets}/{totalSets} sets</h2>
          <p>{workoutPlan.note}</p>
        </div>
        <div className="progress-ring" style={{ "--progress": `${progress}%` }}>
          <span>{progress}</span>
        </div>
      </section>

      <section className="intake-strip reveal">
        <article>
          <span>Goal</span>
          <strong>{joinText([...valuesFrom(onboardingProfile.primaryGoal), `${onboardingProfile.trainingDays} days/week`])}</strong>
        </article>
        <article>
          <span>Guardrail</span>
          <strong>{listText([...valuesFrom(onboardingProfile.pains), onboardingProfile.otherPain])}</strong>
        </article>
      </section>

      {(workoutPlan.warmup.length > 0 || workoutPlan.cooldown.length > 0) && (
        <section className="prep-finish-grid reveal">
          {workoutPlan.warmup.length > 0 && (
            <article>
              <span>Warmup</span>
              {workoutPlan.warmup.slice(0, 3).map((item) => (
                <p key={item}>{item}</p>
              ))}
            </article>
          )}
          {workoutPlan.cooldown.length > 0 && (
            <article>
              <span>Cooldown</span>
              {workoutPlan.cooldown.slice(0, 3).map((item) => (
                <p key={item}>{item}</p>
              ))}
            </article>
          )}
        </section>
      )}

      <section className="exercise-list focused-list reveal">
        <div className="section-title">
          <h3>Workout</h3>
        </div>
        {workoutPlan.exercises.map((exercise, index) => (
          <article
            className={`exercise-plan-card ${expandedExercise === index ? "expanded" : ""}`}
            key={exercise.name}
          >
            <button
              className="exercise-row"
              onClick={() => setExpandedExercise(expandedExercise === index ? -1 : index)}
            >
              <img src={exercise.image} alt="" />
              <span>
                <strong>{exercise.name}</strong>
                <small>{exercise.sets.length} sets · {exercise.muscle} · {restDurations[index]}s rest</small>
              </span>
              <b>{formatWeight(sessionLog[index][0].weight)}</b>
            </button>

            {expandedExercise === index && (
              <div className="exercise-expansion">
                <div className="set-edit-list">
                  {sessionLog[index].map((set, setIndex) => (
                    <div className="set-edit-card" key={`${exercise.name}-${setIndex}`}>
                      <div className="set-edit-heading">
                        <span>Set {setIndex + 1}</span>
                        <b>{set.reps} reps · {formatWeight(set.weight)}</b>
                      </div>
                      <div className="mini-stepper-grid">
                        <MiniStepper
                          label="Weight"
                          value={set.weight}
                          unit="kg"
                          onMinus={() => updatePlannedSet(index, setIndex, "weight", -2.5)}
                          onPlus={() => updatePlannedSet(index, setIndex, "weight", 2.5)}
                        />
                        <MiniStepper
                          label="Reps"
                          value={set.reps}
                          onMinus={() => updatePlannedSet(index, setIndex, "reps", -1)}
                          onPlus={() => updatePlannedSet(index, setIndex, "reps", 1)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rest-editor">
                  <span>Rest period</span>
                  <ControlStepper
                    label="Rest"
                    value={restDurations[index]}
                    unit="sec"
                    onMinus={() => updateRest(index, -15)}
                    onPlus={() => updateRest(index, 15)}
                  />
                </div>
                <div className="mini-video">
                  <div className="play-disc small">
                    <Play size={20} fill="currentColor" />
                  </div>
                  <span>{exercise.name} demo</span>
                  <p>{exercise.cue}</p>
                </div>
                <button className="secondary-action start-exercise" onClick={() => startWorkout(index)}>
                  START HERE
                </button>
              </div>
            )}
          </article>
        ))}
      </section>

      <button className="primary-action sticky-action" onClick={() => startWorkout(0)}>
        START WORKOUT
      </button>
    </div>
  );
}

function WorkoutScreen({
  workoutPlan,
  current,
  currentSet,
  activeExercise,
  activeSet,
  completed,
  completedSets,
  totalSets,
  progress,
  restSeconds = 0,
  editingMode = false,
  updateSet,
  setActiveSet,
  onSaveEdit,
  reportPain,
  skipExercise,
  requestSubstitution,
  coachNotice,
  logSet,
  setScreen,
}) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [logFeedback, setLogFeedback] = useState(false);
  const logTimeoutRef = useRef(null);
  const exerciseCompletedSets = current.sets.filter((_, setIndex) => completed[`${activeExercise}-${setIndex}`]).length;
  const restMinutes = Math.floor(restSeconds / 60).toString().padStart(2, "0");
  const restRemainder = (restSeconds % 60).toString().padStart(2, "0");
  const setLabel = `${activeSet + 1}/${current.sets.length}`;

  useEffect(() => {
    setLogFeedback(false);
    window.clearTimeout(logTimeoutRef.current);
  }, [activeExercise, activeSet, editingMode]);

  useEffect(() => () => window.clearTimeout(logTimeoutRef.current), []);

  function handleLogSet() {
    if (editingMode || logFeedback) {
      return;
    }
    setLogFeedback(true);
    logTimeoutRef.current = window.setTimeout(logSet, 170);
  }

  return (
    <div className={`page workout-page ${editingMode ? "editing-mode" : ""}`}>
      <header className="workout-header">
        <button
          className="icon-button"
          aria-label={editingMode ? "Save edit" : "Close workout"}
          onClick={editingMode ? onSaveEdit : () => setScreen("plan")}
        >
          <X size={30} />
        </button>
        <button className="brand-button" aria-label="Open workout summary" onClick={() => setSummaryOpen(true)}>
          <BrandMark />
        </button>
        <span>{activeExercise + 1}/{workoutPlan.exercises.length}</span>
      </header>

      <section className="workout-context" aria-label="Current workout progress">
        <span>{current.muscle}</span>
        <strong>Set {setLabel}</strong>
        <small>{completedSets}/{totalSets} logged</small>
      </section>

      {editingMode && (
        <div className="edit-status">
          <span>Editing Set</span>
          <strong>{restMinutes}:{restRemainder}</strong>
        </div>
      )}

      <section className="exercise-visual reveal" key={current.name}>
        <img src={current.image} alt="" />
        <div className="visual-scrim" />
        <div className="exercise-copy">
          <span>{current.muscle}</span>
          <h1>{current.name}</h1>
          <p>{current.cue}</p>
        </div>
      </section>

      <section className="execution-note reveal">
        <div className="play-disc small">
          <Play size={18} fill="currentColor" />
        </div>
        <span>Demo cue</span>
        <p>{current.cue}</p>
      </section>

      {coachNotice && <div className="coach-notice reveal">{coachNotice}</div>}

      <section className="set-selector reveal">
        {current.sets.map((_, index) => {
          const key = `${activeExercise}-${index}`;
          return (
            <button
              key={index}
              className={`set-dot ${activeSet === index ? "active" : ""} ${completed[key] ? "done" : ""}`}
              onClick={() => setActiveSet(index)}
            >
              {completed[key] ? <Check size={18} /> : index + 1}
            </button>
          );
        })}
      </section>

      <section className="control-panel reveal">
        <ControlStepper
          label="Weight"
          value={currentSet.weight}
          unit="kg"
          onMinus={() => updateSet("weight", -2.5)}
          onPlus={() => updateSet("weight", 2.5)}
        />
        <ControlStepper
          label="Reps"
          value={currentSet.reps}
          unit=""
          onMinus={() => updateSet("reps", -1)}
          onPlus={() => updateSet("reps", 1)}
        />
      </section>

      {!editingMode && (
        <section className="workout-action-row reveal">
          <button className="secondary-action" onClick={skipExercise}>
            <SkipForward size={18} />
            SKIP
          </button>
          <button className="secondary-action" onClick={requestSubstitution}>
            <RefreshCcw size={18} />
            SWAP
          </button>
          <button className="secondary-action pain-action" onClick={reportPain}>
            REPORT PAIN
          </button>
        </section>
      )}

      <button
        className={`primary-action sticky-action ${logFeedback ? "is-logging" : ""}`}
        onClick={editingMode ? onSaveEdit : handleLogSet}
      >
        {editingMode ? "SAVE SET" : logFeedback ? "SET LOGGED" : "LOG SET"}
      </button>

      {summaryOpen && (
        <WorkoutSummarySheet
          workoutPlan={workoutPlan}
          activeExercise={activeExercise}
          activeSet={activeSet}
          completedSets={completedSets}
          totalSets={totalSets}
          progress={progress}
          exerciseCompletedSets={exerciseCompletedSets}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </div>
  );
}

function WorkoutSummarySheet({
  workoutPlan,
  activeExercise,
  activeSet,
  completedSets,
  totalSets,
  progress,
  exerciseCompletedSets,
  onClose,
}) {
  const [expanded, setExpanded] = useState(false);
  const sheetDragStartRef = useRef(null);
  const exercise = workoutPlan.exercises[activeExercise];
  const nextSet =
    activeSet < exercise.sets.length - 1
      ? { exerciseIndex: activeExercise, setIndex: activeSet + 1 }
      : activeExercise < workoutPlan.exercises.length - 1
        ? { exerciseIndex: activeExercise + 1, setIndex: 0 }
        : null;
  const nextExercise = nextSet ? workoutPlan.exercises[nextSet.exerciseIndex] : null;
  const plannedMinutes = Number.parseInt(workoutPlan.duration, 10);
  const paceMinutes = Math.max(1, Math.round(plannedMinutes / totalSets));

  function handleSummaryWheel(event) {
    if (event.deltaY < -4) {
      setExpanded(true);
    }
  }

  function handleSummaryPointerDown(event) {
    sheetDragStartRef.current = event.clientY;
  }

  function handleSummaryPointerMove(event) {
    if (sheetDragStartRef.current === null) {
      return;
    }
    if (sheetDragStartRef.current - event.clientY > 22) {
      setExpanded(true);
      sheetDragStartRef.current = null;
    }
  }

  function clearSummaryDrag() {
    sheetDragStartRef.current = null;
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className={`summary-sheet ${expanded ? "expanded" : ""}`}
        onClick={(event) => event.stopPropagation()}
        onWheel={handleSummaryWheel}
        onPointerDown={handleSummaryPointerDown}
        onPointerMove={handleSummaryPointerMove}
        onPointerUp={clearSummaryDrag}
        onPointerCancel={clearSummaryDrag}
      >
        <button
          className="sheet-handle"
          type="button"
          aria-label={expanded ? "Collapse workout summary" : "Expand workout summary"}
          onClick={() => setExpanded((value) => !value)}
        />
        <header>
          <span>Workout summary</span>
          <button className="icon-button" onClick={onClose} aria-label="Close summary">
            <X size={24} />
          </button>
        </header>
        <h2>{workoutPlan.title}</h2>
        <div className="summary-progress">
          <div className="progress-ring small-ring" style={{ "--progress": `${progress}%` }}>
            <span>{progress}</span>
          </div>
          <p>
            Set {activeSet + 1} of {exercise.sets.length} · {exercise.name}
            <small>{completedSets}/{totalSets} total sets logged</small>
          </p>
        </div>
        <div className="summary-grid">
          <article>
            <span>Current exercise</span>
            <strong>{exerciseCompletedSets}/{exercise.sets.length}</strong>
          </article>
          <article>
            <span>Session pace</span>
            <strong>{paceMinutes} min/set</strong>
          </article>
        </div>
        <div className="summary-expanded">
          <article className="summary-next">
            <span>Up next</span>
            <h3>{nextExercise ? nextExercise.name : "Workout complete"}</h3>
            <p>
              {nextExercise
                ? `Set ${nextSet.setIndex + 1} · ${sessionLabel(nextExercise, nextSet.setIndex)}`
                : "All planned sets are logged."}
            </p>
          </article>

          <div className="summary-routine">
            <span>Full workout</span>
            {workoutPlan.exercises.map((item, exerciseIndex) => {
              const loggedCount =
                exerciseIndex < activeExercise
                  ? item.sets.length
                  : exerciseIndex === activeExercise
                    ? exerciseCompletedSets
                    : 0;
              return (
                <article
                  className={`summary-exercise ${exerciseIndex === activeExercise ? "current" : ""}`}
                  key={item.name}
                >
                  <img src={item.image} alt="" />
                  <div>
                    <strong>{item.name}</strong>
                    <small>{loggedCount}/{item.sets.length} sets · {item.muscle}</small>
                    <div className="summary-set-row">
                      {item.sets.map((set, setIndex) => {
                        const isDone =
                          exerciseIndex < activeExercise ||
                          (exerciseIndex === activeExercise && setIndex < exerciseCompletedSets);
                        const isCurrent = exerciseIndex === activeExercise && setIndex === activeSet;
                        return (
                          <i
                            className={`${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}
                            key={`${item.name}-${setIndex}`}
                            title={`Set ${setIndex + 1}: ${set.reps} reps`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function ControlStepper({ label, value, unit, onMinus, onPlus }) {
  return (
    <div className="stepper">
      <span>{label}</span>
      <div className="stepper-grid">
        <button onClick={onMinus} aria-label={`Decrease ${label}`}>
          <Minus size={26} />
        </button>
        <strong className="value-readout">
          <AnimatedValue value={value} unit={unit} />
        </strong>
        <button onClick={onPlus} aria-label={`Increase ${label}`}>
          <Plus size={26} />
        </button>
      </div>
    </div>
  );
}

function MiniStepper({ label, value, unit, onMinus, onPlus }) {
  return (
    <div className="mini-stepper">
      <span>{label}</span>
      <div>
        <button onClick={onMinus} aria-label={`Decrease ${label}`}>
          <Minus size={18} />
        </button>
        <strong className="value-readout">
          <AnimatedValue value={value} unit={unit} />
        </strong>
        <button onClick={onPlus} aria-label={`Increase ${label}`}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

function AnimatedValue({ value, unit }) {
  const previousRef = useRef(value);
  const numericValue = Number(value);
  const numericPrevious = Number(previousRef.current);
  const direction =
    Number.isFinite(numericValue) && Number.isFinite(numericPrevious)
      ? numericValue > numericPrevious
        ? "up"
        : numericValue < numericPrevious
          ? "down"
          : "same"
      : "same";

  useEffect(() => {
    previousRef.current = value;
  }, [value]);

  return (
    <>
      <span className="number-tick" data-direction={direction} key={`${value}-${direction}`}>
        {value}
      </span>
      {unit && <small>{unit}</small>}
    </>
  );
}

function RestScreen({
  workoutPlan,
  current,
  activeExercise,
  activeSet,
  completed,
  completedSets,
  totalSets,
  progress,
  currentRest,
  restSeconds,
  nextTarget,
  continueAfterRest,
  onEditSet,
  setScreen,
}) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const minutes = Math.floor(restSeconds / 60).toString().padStart(2, "0");
  const seconds = (restSeconds % 60).toString().padStart(2, "0");
  const nextExercise = nextTarget ? workoutPlan.exercises[nextTarget.exercise] : null;
  const exerciseCompletedSets = current.sets.filter((_, setIndex) => completed[`${activeExercise}-${setIndex}`]).length;

  return (
    <div className="page rest-page">
      <header className="workout-header">
        <button className="icon-button" aria-label="Back to workout" onClick={() => setScreen("workout")}>
          <ChevronLeft size={32} />
        </button>
        <button className="brand-button" aria-label="Open workout summary" onClick={() => setSummaryOpen(true)}>
          <BrandMark />
        </button>
        <span>Rest</span>
      </header>

      <section className="rest-focus reveal">
        <span>Set logged</span>
        <h1>{minutes}:{seconds}</h1>
        <p>Recover, breathe, and get ready for the next working set.</p>
        <div className="timer-ring" style={{ "--rest-progress": `${Math.max(0, (restSeconds / currentRest) * 100)}%` }}>
          <Timer size={42} />
        </div>
      </section>

      <section className="next-card reveal">
        <span>Up next</span>
        <h2>{nextExercise ? nextExercise.name : "Workout complete"}</h2>
        <p>{nextExercise ? `Set ${nextTarget.set + 1} · ${sessionLabel(nextExercise, nextTarget.set)}` : "Nice work. Save this session from the chatbot."}</p>
      </section>

      <div className="rest-actions reveal">
        <button className="secondary-action" onClick={onEditSet}>
          EDIT SET
        </button>
        <button className="primary-action" onClick={continueAfterRest}>
          {restSeconds > 0 ? "SKIP REST" : "NEXT SET"}
        </button>
      </div>

      {summaryOpen && (
        <WorkoutSummarySheet
          workoutPlan={workoutPlan}
          activeExercise={activeExercise}
          activeSet={activeSet}
          completedSets={completedSets}
          totalSets={totalSets}
          progress={progress}
          exerciseCompletedSets={exerciseCompletedSets}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </div>
  );
}

function ExerciseDoneScreen({
  workoutPlan,
  current,
  activeExercise,
  activeSet,
  completed,
  completedSets,
  totalSets,
  progress,
  currentRest,
  restSeconds,
  nextTarget,
  continueAfterRest,
  onEditSet,
  setScreen,
}) {
  const [timerMode, setTimerMode] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const minutes = Math.floor(restSeconds / 60).toString().padStart(2, "0");
  const seconds = (restSeconds % 60).toString().padStart(2, "0");
  const nextExercise = nextTarget ? workoutPlan.exercises[nextTarget.exercise] : null;
  const exerciseCompletedSets = current.sets.filter((_, setIndex) => completed[`${activeExercise}-${setIndex}`]).length;

  useEffect(() => {
    const timeout = window.setTimeout(() => setTimerMode(true), 900);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className={`page rest-page exercise-done-page ${timerMode ? "timer-visible" : ""}`}>
      <header className="workout-header">
        <button className="icon-button" aria-label="Back to workout" onClick={() => setScreen("workout")}>
          <ChevronLeft size={32} />
        </button>
        <button className="brand-button" aria-label="Open workout summary" onClick={() => setSummaryOpen(true)}>
          <BrandMark />
        </button>
        <span>Next</span>
      </header>

      <section className="exercise-done-focus reveal">
        <div
          className="done-check"
          style={{ "--rest-progress": `${Math.max(0, (restSeconds / currentRest) * 100)}%` }}
        >
          {timerMode ? <strong>{minutes}:{seconds}</strong> : <Check size={58} />}
        </div>
        <span>Exercise finished</span>
        <h1>{current.name}</h1>
        <p>Rest {minutes}:{seconds}, then move to {nextExercise ? nextExercise.name : "the finish"}.</p>
      </section>

      <section className="next-card transition-card reveal">
        <span>Change exercise</span>
        <h2>{nextExercise ? nextExercise.name : "Workout complete"}</h2>
        <p>{nextExercise ? `${nextExercise.muscle} · Set 1 · ${sessionLabel(nextExercise, 0)}` : "All exercises are complete."}</p>
        <div className="timer-rail">
          <i style={{ width: `${Math.max(0, (restSeconds / currentRest) * 100)}%` }} />
        </div>
      </section>

      <div className="rest-actions reveal">
        <button className="secondary-action" onClick={onEditSet}>
          EDIT SET
        </button>
        <button className="primary-action" onClick={continueAfterRest}>
          {restSeconds > 0 ? "SKIP REST" : "NEXT EXERCISE"}
        </button>
      </div>

      {summaryOpen && (
        <WorkoutSummarySheet
          workoutPlan={workoutPlan}
          activeExercise={activeExercise}
          activeSet={activeSet}
          completedSets={completedSets}
          totalSets={totalSets}
          progress={progress}
          exerciseCompletedSets={exerciseCompletedSets}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </div>
  );
}

function sessionLabel(exercise, setIndex) {
  const set = exercise.sets[setIndex];
  return `${set.reps} reps · ${formatWeight(set.weight)}`;
}

function openWhatsAppSummaryPrompt() {
  if (typeof window === "undefined") return;
  window.location.href = "whatsapp://send?text=Ready%20summarize%20my%20results";
}

function CompleteScreen({ sessionResult, completedSets, totalSets }) {
  const completedExercises = sessionResult?.exercises?.filter((exercise) => exercise.completedSets > 0) || [];
  return (
    <div className="page complete-page">
      <header className="top-row">
        <div className="top-spacer" aria-hidden="true" />
        <BrandMark />
        <div className="plan-chip">Done</div>
      </header>
      <section className="rest-focus reveal">
        <span>Workout complete</span>
        <h1>{completedSets}/{totalSets}</h1>
        <p>Your sets, reps, weights, and volume are saved. Go back to WhatsApp for the recap.</p>
      </section>
      {sessionResult && (
        <section className="result-card reveal" aria-label="Session result sent to chatbot">
          <span>Workout summary saved</span>
          <div>
            <strong>{sessionResult.totalVolume.toLocaleString()}</strong>
            <small>Total volume</small>
          </div>
          <div>
            <strong>{sessionResult.completedSets}/{sessionResult.totalSets}</strong>
            <small>Logged sets</small>
          </div>
        </section>
      )}
      {completedExercises.length > 0 && (
        <section className="completion-list reveal" aria-label="Completed exercise summary">
          {completedExercises.slice(0, 5).map((exercise) => (
            <article key={exercise.name}>
              <strong>{exercise.name}</strong>
              <span>{exercise.completedSets}/{exercise.totalSets} sets · {exercise.volume.toLocaleString()} volume</span>
            </article>
          ))}
        </section>
      )}
      <section className="whatsapp-return-card reveal">
        <span>Next step</span>
        <strong>Return to WhatsApp</strong>
        <p>Text: Ready summarize my results</p>
      </section>
      <button className="primary-action sticky-action" onClick={openWhatsAppSummaryPrompt}>
        OPEN WHATSAPP
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
