import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Check,
  ChevronLeft,
  Dumbbell,
  Minus,
  Play,
  Plus,
  Timer,
  X,
} from "lucide-react";
import "./styles.css";

const exerciseImageMap = {
  "leg press": "/exercises/leg-press.png",
  "hamstring curl": "/exercises/hamstring-curl.png",
  "seated hamstring curl": "/exercises/hamstring-curl.png",
  "lying hamstring curl": "/exercises/hamstring-curl.png",
  "leg curl": "/exercises/hamstring-curl.png",
  "cable crunch": "/exercises/cable-crunch.png",
  "kneeling cable crunch": "/exercises/cable-crunch.png",
};

const fallbackExerciseImage = "/exercises/exercise-placeholder.svg";

function formatWeight(weight) {
  return weight ? `${weight} KG` : "BW";
}

const onboardingDefaults = {
  goal: "Lose 8-10 kg while building definition",
  timeline: "6 months",
  schedule: "3 days/week",
  sessionLength: "60-75 min",
  trainingStyle: ["Machines", "Dumbbells", "Treadmill walking"],
  avoid: ["Jumping", "Sprints", "Deep loaded squats"],
  constraints: ["Runner's knee", "Lower-back discomfort", "Desk job"],
  baseline: ["Leg press 100 KG x 10", "Hip thrust 70 KG x 10", "RDL 40 KG x 8"],
  lifestyle: ["5k steps/day", "6.5h sleep", "Moderate-high stress"],
  nutrition: ["Inconsistent protein", "Weekend overeating", "Stress eating"],
  motivation: "8/10",
  confidence: "6/10",
  mainConcern: "Fear of re-injuring knee",
};

const onboardingSteps = [
  {
    eyebrow: "Goal",
    title: "What should this plan solve?",
    copy: "The case study points to fat loss, tone, confidence, energy, and less discomfort.",
    key: "goal",
    type: "single",
    options: [
      "Lose 8-10 kg while building definition",
      "Improve gym confidence",
      "Reduce lower-back discomfort",
    ],
  },
  {
    eyebrow: "Training",
    title: "What fits her week?",
    copy: "Andrea already trains three times per week and prefers controlled gym work over high-intensity circuits.",
    key: "trainingStyle",
    type: "multi",
    options: ["Machines", "Dumbbells", "Treadmill walking", "Cycling"],
    stat: { label: "Current rhythm", value: "3x", detail: "60-75 min sessions" },
  },
  {
    eyebrow: "Limits",
    title: "What should the plan avoid?",
    copy: "Runner's knee means the plan needs low-impact lower-body work and no deep loaded squats.",
    key: "avoid",
    type: "multi",
    options: ["Jumping", "Sprints", "Deep loaded squats", "Burpees"],
  },
  {
    eyebrow: "Baseline",
    title: "What can she lift today?",
    copy: "These numbers anchor the first plan so the weights feel specific, not generic.",
    key: "baseline",
    type: "multi",
    options: ["Leg press 100 KG x 10", "Hip thrust 70 KG x 10", "RDL 40 KG x 8", "Lat pulldown 40 KG x 10"],
    stat: { label: "Body profile", value: "72 KG", detail: "168 cm · 29% est. body fat" },
  },
  {
    eyebrow: "Lifestyle",
    title: "What affects recovery?",
    copy: "Sleep, stress, movement, and protein consistency should change how aggressive the plan feels.",
    key: "lifestyle",
    type: "multi",
    options: ["5k steps/day", "6.5h sleep", "Moderate-high stress", "1.5L water"],
  },
  {
    eyebrow: "Readiness",
    title: "What should the coach remember?",
    copy: "Motivation is high, confidence is moderate, and the plan needs to protect the knee.",
    key: "mainConcern",
    type: "single",
    options: ["Fear of re-injuring knee", "Gym confidence", "Weekend overeating"],
    stat: { label: "Mindset", value: "8/10", detail: "Motivation · 6/10 confidence" },
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
          };
        })
        .filter(Boolean)
    : [];

  if (exercises.length === 0) {
    return null;
  }

  return {
    title: String(input.title || "AI workout"),
    source: String(input.source || "AI generated plan"),
    duration: String(input.duration || `${Math.max(20, exercises.length * 14)} min`),
    focus: String(input.focus || "Generated session"),
    note: String(input.note || "Review the plan, adjust sets, then start when ready."),
    chatbotRequestId: input.chatbotRequestId || input.id || "demo-workout",
    exercises,
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

function App() {
  const screenRef = useRef(null);
  const [workoutState, setWorkoutState] = useState({ status: "loading", workoutPlan: null, error: "" });
  const [screen, setScreen] = useState("onboarding");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingProfile, setOnboardingProfile] = useState(onboardingDefaults);
  const [activeExercise, setActiveExercise] = useState(0);
  const [activeSet, setActiveSet] = useState(0);
  const [completed, setCompleted] = useState({});
  const [restSeconds, setRestSeconds] = useState(0);
  const [editReturnScreen, setEditReturnScreen] = useState("rest");
  const [restDurations, setRestDurations] = useState([]);
  const [sessionLog, setSessionLog] = useState([]);
  const [sessionResult, setSessionResult] = useState(null);

  const workoutPlan = workoutState.workoutPlan;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const loadedPlan = loadWorkoutPayload();
        if (!loadedPlan) {
          setWorkoutState({ status: "empty", workoutPlan: null, error: "" });
          return;
        }
        setWorkoutState({ status: "ready", workoutPlan: loadedPlan, error: "" });
        setRestDurations(loadedPlan.exercises.map((exercise) => exercise.rest));
        setSessionLog(loadedPlan.exercises.map((exercise) => exercise.sets.map((set) => ({ ...set }))));
      } catch (error) {
        setWorkoutState({
          status: "error",
          workoutPlan: null,
          error: error instanceof Error ? error.message : "Could not load workout.",
        });
      }
    }, 260);

    return () => window.clearTimeout(timer);
  }, []);

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
    setScreen("workout");
  }

  function logSet() {
    setCompleted((previous) => ({ ...previous, [`${activeExercise}-${activeSet}`]: true }));
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
      setScreen("complete");
      return;
    }
    setActiveExercise(nextTarget.exercise);
    setActiveSet(nextTarget.set);
    setScreen("workout");
  }

  function updateOnboardingValue(key, value, type) {
    setOnboardingProfile((previous) => {
      if (type !== "multi") {
        return { ...previous, [key]: value };
      }
      const currentValues = previous[key] || [];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      return { ...previous, [key]: nextValues };
    });
  }

  function nextOnboardingStep() {
    if (onboardingStep < onboardingSteps.length) {
      setOnboardingStep((value) => value + 1);
      return;
    }
    publishOnboardingProfile(onboardingProfile);
    setScreen("plan");
  }

  function previousOnboardingStep() {
    if (onboardingStep > 0) {
      setOnboardingStep((value) => value - 1);
      return;
    }
    setScreen("plan");
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
            <OnboardingScreen
              stepIndex={onboardingStep}
              profile={onboardingProfile}
              updateValue={updateOnboardingValue}
              nextStep={nextOnboardingStep}
              previousStep={previousOnboardingStep}
              skipToPlan={() => setScreen("plan")}
            />
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
              startWorkout={startWorkout}
              allDone={allDone}
            />
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
  nextStep,
  previousStep,
  skipToPlan,
}) {
  const isSummary = stepIndex >= onboardingSteps.length;
  const step = onboardingSteps[Math.min(stepIndex, onboardingSteps.length - 1)];
  const progress = `${Math.round(((stepIndex + 1) / (onboardingSteps.length + 1)) * 100)}%`;

  if (isSummary) {
    return (
      <div className="page onboarding-page">
        <header className="onboarding-top">
          <BrandMark />
          <button onClick={skipToPlan}>View plan</button>
        </header>

        <section className="onboarding-hero reveal">
          <span>Trainer brief</span>
          <h1>Ready to build Andrea's plan</h1>
          <p>Use this profile to generate controlled, knee-friendly training with realistic progression.</p>
        </section>

        <section className="brief-card reveal">
          <article>
            <span>Goal</span>
            <strong>{profile.goal}</strong>
          </article>
          <article>
            <span>Training style</span>
            <strong>{profile.trainingStyle.join(" · ")}</strong>
          </article>
          <article>
            <span>Avoid</span>
            <strong>{profile.avoid.join(" · ")}</strong>
          </article>
          <article>
            <span>Coach note</span>
            <strong>{profile.mainConcern}</strong>
          </article>
        </section>

        <OnboardingFooter
          current={onboardingSteps.length + 1}
          total={onboardingSteps.length + 1}
          progress={progress}
          onBack={previousStep}
          onNext={nextStep}
          nextLabel="Build plan"
        />
      </div>
    );
  }

  const selected = profile[step.key];

  return (
    <div className="page onboarding-page">
      <header className="onboarding-top">
        <BrandMark />
        <button onClick={skipToPlan}>View plan</button>
      </header>

      <section className="onboarding-hero reveal" key={step.title}>
        <span>{step.eyebrow}</span>
        <h1>{step.title}</h1>
        <p>{step.copy}</p>
      </section>

      {step.stat && (
        <section className="onboarding-stat reveal">
          <span>{step.stat.label}</span>
          <strong>{step.stat.value}</strong>
          <small>{step.stat.detail}</small>
        </section>
      )}

      <section className="choice-stack reveal">
        {step.options.map((option) => {
          const active = Array.isArray(selected) ? selected.includes(option) : selected === option;
          return (
            <button
              className={`choice-card ${active ? "selected" : ""}`}
              key={option}
              onClick={() => updateValue(step.key, option, step.type)}
            >
              <span>{option}</span>
              <i>{active ? <Check size={20} /> : null}</i>
            </button>
          );
        })}
      </section>

      <OnboardingFooter
        current={stepIndex + 1}
        total={onboardingSteps.length + 1}
        progress={progress}
        onBack={previousStep}
        onNext={nextStep}
        nextLabel="Next"
      />
    </div>
  );
}

function OnboardingFooter({ current, total, progress, onBack, onNext, nextLabel }) {
  return (
    <footer className="onboarding-footer">
      <div className="onboarding-progress" aria-hidden="true">
        <i style={{ width: progress }} />
      </div>
      <button className="text-action" onClick={onBack}>
        Back
      </button>
      <strong>{current}/{total}</strong>
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
        <span>Workout import failed</span>
        <h1>Check payload</h1>
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
          <strong>{onboardingProfile.goal}</strong>
        </article>
        <article>
          <span>Guardrail</span>
          <strong>{onboardingProfile.mainConcern}</strong>
        </article>
      </section>

      <section className="exercise-list focused-list reveal">
        <div className="section-title">
          <h3>Plan</h3>
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
        <strong>
          {value}
          {unit && <small>{unit}</small>}
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
        <strong>
          {value}
          {unit && <small>{unit}</small>}
        </strong>
        <button onClick={onPlus} aria-label={`Increase ${label}`}>
          <Plus size={18} />
        </button>
      </div>
    </div>
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

function CompleteScreen({ sessionResult, completedSets, totalSets, startWorkout }) {
  return (
    <div className="page complete-page">
      <header className="top-row">
        <button className="icon-button" aria-label="Back">
          <ChevronLeft size={32} />
        </button>
        <BrandMark />
        <div className="plan-chip">Done</div>
      </header>
      <section className="rest-focus reveal">
        <span>Workout complete</span>
        <h1>{completedSets}/{totalSets}</h1>
        <p>All planned sets are logged. The chatbot can now summarize progress.</p>
      </section>
      {sessionResult && (
        <section className="result-card reveal" aria-label="Session result sent to chatbot">
          <span>Result object ready</span>
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
      <button className="primary-action sticky-action" onClick={() => startWorkout(0)}>
        REVIEW PLAN
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
