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

const workoutPlan = {
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
      image:
        "https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?auto=format&fit=crop&w=900&q=80",
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
      image:
        "https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=80",
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
      image:
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80",
    },
  ],
};

function App() {
  const screenRef = useRef(null);
  const [screen, setScreen] = useState("plan");
  const [activeExercise, setActiveExercise] = useState(0);
  const [activeSet, setActiveSet] = useState(0);
  const [completed, setCompleted] = useState({});
  const [restSeconds, setRestSeconds] = useState(0);
  const [editReturnScreen, setEditReturnScreen] = useState("rest");
  const [restDurations, setRestDurations] = useState(() =>
    workoutPlan.exercises.map((exercise) => exercise.rest),
  );
  const [sessionLog, setSessionLog] = useState(() =>
    workoutPlan.exercises.map((exercise) => exercise.sets.map((set) => ({ ...set }))),
  );

  const current = workoutPlan.exercises[activeExercise];
  const currentSet = sessionLog[activeExercise][activeSet];
  const currentRest = restDurations[activeExercise];
  const totalSets = workoutPlan.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
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
    if (activeExercise < workoutPlan.exercises.length - 1) {
      return { exercise: activeExercise + 1, set: 0 };
    }
    return null;
  }, [activeExercise, activeSet, current.sets.length]);

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
      setScreen("complete");
      return;
    }
    setActiveExercise(nextTarget.exercise);
    setActiveSet(nextTarget.set);
    setScreen("workout");
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <section ref={screenRef} className={`screen focused-screen screen-${screen}`}>
          {screen === "plan" && (
            <PlanScreen
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
          {screen === "workout" && (
            <WorkoutScreen
              current={current}
              currentSet={currentSet}
              activeExercise={activeExercise}
              activeSet={activeSet}
              completed={completed}
              completedSets={completedSets}
              totalSets={totalSets}
              progress={progress}
              sessionLog={sessionLog}
              updateSet={updateSet}
              setActiveSet={setActiveSet}
              logSet={logSet}
              setScreen={setScreen}
            />
          )}
          {screen === "rest" && (
            <RestScreen
              current={current}
              activeExercise={activeExercise}
              activeSet={activeSet}
              completed={completed}
              completedSets={completedSets}
              totalSets={totalSets}
              progress={progress}
              sessionLog={sessionLog}
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
          {screen === "restEdit" && (
            <WorkoutScreen
              current={current}
              currentSet={currentSet}
              activeExercise={activeExercise}
              activeSet={activeSet}
              completed={completed}
              completedSets={completedSets}
              totalSets={totalSets}
              progress={progress}
              sessionLog={sessionLog}
              restSeconds={restSeconds}
              editingMode
              updateSet={updateSet}
              setActiveSet={setActiveSet}
              onSaveEdit={() => setScreen(editReturnScreen)}
              logSet={logSet}
              setScreen={setScreen}
            />
          )}
          {screen === "exerciseDone" && (
            <ExerciseDoneScreen
              current={current}
              activeExercise={activeExercise}
              activeSet={activeSet}
              completed={completed}
              completedSets={completedSets}
              totalSets={totalSets}
              progress={progress}
              sessionLog={sessionLog}
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
          {screen === "complete" && (
            <CompleteScreen
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

function BrandMark() {
  return (
    <div className="brand-mark" aria-label="Setline">
      <Dumbbell size={20} />
    </div>
  );
}

function PlanScreen({
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
              <b>{sessionLog[index][0].weight || "BW"}</b>
            </button>

            {expandedExercise === index && (
              <div className="exercise-expansion">
                <div className="set-edit-list">
                  {sessionLog[index].map((set, setIndex) => (
                    <div className="set-edit-card" key={`${exercise.name}-${setIndex}`}>
                      <div className="set-edit-heading">
                        <span>Set {setIndex + 1}</span>
                        <b>{set.reps} reps · {set.weight || "BW"}{set.weight ? "kg" : ""}</b>
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
  current,
  currentSet,
  activeExercise,
  activeSet,
  completed,
  completedSets,
  totalSets,
  progress,
  sessionLog,
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
          activeExercise={activeExercise}
          activeSet={activeSet}
          completedSets={completedSets}
          totalSets={totalSets}
          progress={progress}
          exerciseCompletedSets={exerciseCompletedSets}
          sessionLog={sessionLog}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </div>
  );
}

function WorkoutSummarySheet({
  activeExercise,
  activeSet,
  completedSets,
  totalSets,
  progress,
  exerciseCompletedSets,
  sessionLog,
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
  const volume = sessionLog.reduce(
    (total, exerciseSets) =>
      total + exerciseSets.reduce((sum, set) => sum + set.reps * set.weight, 0),
    0,
  );

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
            <span>Est. volume</span>
            <strong>{volume.toLocaleString()}</strong>
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
  current,
  activeExercise,
  activeSet,
  completed,
  completedSets,
  totalSets,
  progress,
  sessionLog,
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
          activeExercise={activeExercise}
          activeSet={activeSet}
          completedSets={completedSets}
          totalSets={totalSets}
          progress={progress}
          exerciseCompletedSets={exerciseCompletedSets}
          sessionLog={sessionLog}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </div>
  );
}

function ExerciseDoneScreen({
  current,
  activeExercise,
  activeSet,
  completed,
  completedSets,
  totalSets,
  progress,
  sessionLog,
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
          activeExercise={activeExercise}
          activeSet={activeSet}
          completedSets={completedSets}
          totalSets={totalSets}
          progress={progress}
          exerciseCompletedSets={exerciseCompletedSets}
          sessionLog={sessionLog}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </div>
  );
}

function sessionLabel(exercise, setIndex) {
  const set = exercise.sets[setIndex];
  return `${set.reps} reps · ${set.weight || "BW"}${set.weight ? "kg" : ""}`;
}

function CompleteScreen({ completedSets, totalSets, startWorkout }) {
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
      <button className="primary-action sticky-action" onClick={() => startWorkout(0)}>
        REVIEW PLAN
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
