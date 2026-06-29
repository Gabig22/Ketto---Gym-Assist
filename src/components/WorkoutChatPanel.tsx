import { useEffect, useMemo, useRef, useState } from "react";
import type { Exercise, WorkoutBlock, WorkoutSession, WorkoutSet, WorkoutTemplate } from "../types";
import RoutineBuilderPanel from "./RoutineBuilderPanel";
import WorkoutCard from "./WorkoutCard";
import {
  addSetToWorkout,
  discardActiveWorkout,
  finishWorkout,
  getActiveWorkout,
  getLastSessionForTemplate,
  getSuggestedWorkoutTemplate,
  getSuggestedStart,
  getWorkoutTemplates,
  getSessionVolume,
  normalizeWorkoutTemplate,
  saveIncompleteWorkout,
  saveWorkoutTemplates,
  startWorkout,
  updateWorkoutExerciseNote,
} from "../services/workoutService";
import { loadWorkoutHistory } from "../storage/workoutHistory";
import { loadActiveWorkoutState, saveActiveWorkoutState } from "../storage/workoutSession";

interface WorkoutChatPanelProps {
  mode: "routine" | "free";
  onSaved: () => void;
  onGoHome: () => void;
  onViewHistory: () => void;
  onBack: () => void;
  backRequestId: number;
}

const exerciseNotes = ["Técnica bien", "Mejorar técnica", "Molestia", "Muy pesado", "Subir peso próxima vez", "Mantener peso"];
const restOptions = [60, 90, 120];

interface WorkoutStep {
  block: WorkoutBlock;
  blockIndex: number;
  roundNumber: number;
  exercise: Exercise;
  exerciseIndex: number;
}

export default function WorkoutChatPanel({ mode, onSaved, onGoHome, onViewHistory, onBack, backRequestId }: WorkoutChatPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const initialActiveStateRef = useRef(loadActiveWorkoutState());
  const lastHandledBackRequestRef = useRef(backRequestId);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => getWorkoutTemplates());
  const [showRoutineBuilder, setShowRoutineBuilder] = useState(false);
  const [routineBuilderTemplateId, setRoutineBuilderTemplateId] = useState<string | undefined>();
  const [templateToDelete, setTemplateToDelete] = useState<WorkoutTemplate | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(() => getActiveWorkout());
  const [template, setTemplate] = useState<WorkoutTemplate | null>(() => {
    const activeSession = getActiveWorkout();
    return templates.find((item) => item.id === activeSession?.templateId) ?? null;
  });
  const normalizedTemplate = template ? normalizeWorkoutTemplate(template) : null;
  const steps = useMemo(() => (normalizedTemplate ? buildWorkoutSteps(normalizedTemplate) : []), [normalizedTemplate]);
  const [stepIndex, setStepIndex] = useState(initialActiveStateRef.current?.currentStepIndex ?? 0);
  const currentStep = steps[stepIndex];
  const currentExercise = currentStep?.exercise;
  const suggestion = currentExercise ? getSuggestedStart(currentExercise) : null;
  const [weightKg, setWeightKg] = useState(initialActiveStateRef.current?.currentWeightKg ?? suggestion?.weightKg ?? 0);
  const [reps, setReps] = useState(initialActiveStateRef.current?.currentReps ?? suggestion?.reps ?? 10);
  const [timeSeconds, setTimeSeconds] = useState(initialActiveStateRef.current?.currentTimeSeconds ?? currentExercise?.targetTimeSeconds ?? 30);
  const [defaultRestSeconds, setDefaultRestSeconds] = useState(90);
  const [restSecondsLeft, setRestSecondsLeft] = useState(initialActiveStateRef.current?.restSecondsLeft ?? 0);
  const [isRestPaused, setIsRestPaused] = useState(initialActiveStateRef.current?.isRestPaused ?? false);
  const [restDoneMessage, setRestDoneMessage] = useState("");
  const [pendingSummary, setPendingSummary] = useState<WorkoutSession | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitAction, setExitAction] = useState<"home" | "back">("home");

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepIndex, showRoutineBuilder]);

  useEffect(() => {
    if (!session) {
      return;
    }

    saveActiveWorkoutState({
      currentStepIndex: stepIndex,
      currentWeightKg: weightKg,
      currentReps: reps,
      currentTimeSeconds: timeSeconds,
      restSecondsLeft,
      isRestPaused,
    });
  }, [isRestPaused, reps, restSecondsLeft, session, stepIndex, timeSeconds, weightKg]);

  useEffect(() => {
    if (!session || !steps.length || steps[stepIndex]) {
      return;
    }

    const pendingIndex = findFirstPendingStepIndex(steps, session);
    moveToStep(pendingIndex, steps);
  }, [session, stepIndex, steps]);

  useEffect(() => {
    if (backRequestId === lastHandledBackRequestRef.current) {
      return;
    }

    lastHandledBackRequestRef.current = backRequestId;
    handleBackRequest();
  }, [backRequestId]);

  useEffect(() => {
    if (restSecondsLeft <= 0 || isRestPaused) {
      return;
    }

    const timer = window.setInterval(() => {
      setRestSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setRestDoneMessage("Descanso terminado. Vamos con la siguiente serie.");
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRestPaused, restSecondsLeft]);

  function beginWorkout(nextTemplate: WorkoutTemplate) {
    const nextNormalizedTemplate = normalizeWorkoutTemplate(nextTemplate);
    const nextSteps = buildWorkoutSteps(nextNormalizedTemplate);

    if (nextSteps.length === 0) {
      return;
    }

    const nextSession = startWorkout(nextNormalizedTemplate);
    const nextSuggestion = getSuggestedStart(nextSteps[0].exercise);

    setTemplate(nextNormalizedTemplate);
    setSession(nextSession);
    setStepIndex(0);
    setWeightKg(nextSuggestion.weightKg);
    setReps(nextSuggestion.reps);
    setTimeSeconds(getInitialTimeSeconds(nextSteps[0].exercise));
    setRestSecondsLeft(0);
    setIsRestPaused(false);
  }

  function beginFreeWorkout() {
    beginWorkout({
      id: "free-training",
      name: "Entreno libre",
      focus: "Libre",
      exercises: [
        {
          id: "free-exercise",
          name: "Ejercicio libre",
          muscleGroup: "Libre",
          targetSets: 6,
          repRange: "8-12",
        },
      ],
    });
  }

  function deleteTemplate(templateToRemove: WorkoutTemplate) {
    const nextTemplates = templates.filter((item) => item.id !== templateToRemove.id);
    setTemplates(nextTemplates);
    saveWorkoutTemplates(nextTemplates);
    setTemplateToDelete(null);
  }

  function moveToStep(index: number, selectedSteps = steps) {
    if (!selectedSteps.length) {
      return;
    }

    const safeIndex = Math.min(Math.max(index, 0), selectedSteps.length - 1);
    const nextExercise = selectedSteps[safeIndex].exercise;
    const nextSuggestion = getSuggestedStart(nextExercise);

    setStepIndex(safeIndex);
    setWeightKg(nextSuggestion.weightKg);
    setReps(nextSuggestion.reps);
    setTimeSeconds(getInitialTimeSeconds(nextExercise));
  }

  function confirmSet() {
    if (!session || !currentExercise) {
      return;
    }

    const isTimedExercise = isTimeBasedExercise(currentExercise);
    const nextSession = addSetToWorkout(session, {
      exerciseId: currentExercise.id,
      exerciseName: currentExercise.name,
      blockId: currentStep.block.id,
      blockName: currentStep.block.name,
      blockType: currentStep.block.type,
      roundNumber: currentStep.roundNumber,
      weightKg,
      reps: isTimedExercise ? 0 : reps,
      timeSeconds: isTimedExercise ? timeSeconds : undefined,
    });

    setSession(nextSession);
    const nextStep = steps[stepIndex + 1];
    const isRoundDone = !nextStep || nextStep.block.id !== currentStep.block.id || nextStep.roundNumber !== currentStep.roundNumber;
    const configuredRestSeconds = isRoundDone ? currentStep.block.restAfterRoundSeconds : currentStep.block.restBetweenExercisesSeconds;
    const nextRestSeconds = configuredRestSeconds ?? defaultRestSeconds;

    setRestSecondsLeft(nextRestSeconds);
    setIsRestPaused(false);
    setRestDoneMessage(nextRestSeconds > 0 ? (isRoundDone ? "Descanso de ronda activo." : "Proxima serie.") : "");
  }

  function goToPreviousExercise() {
    moveToStep(stepIndex - 1);
  }

  function goToNextExercise() {
    moveToStep(stepIndex + 1);
  }

  function handleFinish() {
    if (!session) {
      return;
    }

    setPendingSummary({
      ...session,
      completedAt: new Date().toISOString(),
      status: "complete",
    });
  }

  function handleDiscard() {
    if (session) {
      if (session.sets.length === 0) {
        discardCurrentWorkout("home");
        return;
      }

      setExitAction("home");
      setShowExitConfirm(true);
      return;
    }

    discardCurrentWorkout("home");
  }

  function handleBackRequest() {
    if (!session) {
      onBack();
      return;
    }

    if (session.sets.length === 0) {
      discardCurrentWorkout("back");
      return;
    }

    setExitAction("back");
    setShowExitConfirm(true);
  }

  function finishExitAction() {
    if (exitAction === "back") {
      onBack();
      return;
    }

    onGoHome();
  }

  function discardCurrentWorkout(nextExitAction = exitAction) {
    discardActiveWorkout();
    setSession(null);
    setTemplate(null);
    setShowExitConfirm(false);
    if (nextExitAction === "back") {
      onBack();
    }
  }

  function saveCurrentAsIncomplete() {
    if (!session) {
      return;
    }

    saveIncompleteWorkout(session);
    setSession(null);
    setTemplate(null);
    setShowExitConfirm(false);
    onSaved();
    finishExitAction();
  }

  function saveCompletedAndGoHome() {
    if (!pendingSummary) {
      return;
    }

    finishWorkout(pendingSummary);
    setPendingSummary(null);
    setSession(null);
    setTemplate(null);
    onSaved();
    onGoHome();
  }

  function saveCompletedAndViewHistory() {
    if (!pendingSummary) {
      return;
    }

    finishWorkout(pendingSummary);
    setPendingSummary(null);
    setSession(null);
    setTemplate(null);
    onSaved();
    onViewHistory();
  }

  function updateCurrentExerciseNote(note: string) {
    if (!session || !currentExercise) {
      return;
    }

    setSession(updateWorkoutExerciseNote(session, currentExercise.id, note));
  }

  if (pendingSummary) {
    return (
      <WorkoutSummaryPanel
        session={pendingSummary}
        onSaveHome={saveCompletedAndGoHome}
        onSaveHistory={saveCompletedAndViewHistory}
        onContinue={() => setPendingSummary(null)}
      />
    );
  }

  if (showRoutineBuilder) {
    return (
      <RoutineBuilderPanel
        templates={templates}
        initialTemplateId={routineBuilderTemplateId}
        onSaved={(nextTemplates) => {
          setTemplates(nextTemplates);
          setShowRoutineBuilder(false);
          setRoutineBuilderTemplateId(undefined);
        }}
        onBack={() => {
          setShowRoutineBuilder(false);
          setRoutineBuilderTemplateId(undefined);
        }}
      />
    );
  }

  if (session && !template) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-5">
        <div className="rounded-2xl border border-[#FFD5C2] bg-white p-5 shadow-sm">
          <div className="inline-flex rounded-full bg-[#FFF7F3] px-3 py-1 text-xs font-black text-[#FF8A5B]">
            Recuperacion
          </div>
          <h2 className="mt-4 text-xl font-black text-[#1F2937]">Hay una sesion activa, pero no encontre la rutina original.</h2>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            Podes guardar lo cargado como incompleto o descartar esta sesion para arrancar de nuevo.
          </p>
          <div className="mt-5 grid gap-2">
            <button type="button" className="rounded-xl bg-[#FF8A5B] px-3 py-3 text-sm font-bold text-white" onClick={saveCurrentAsIncomplete}>
              Guardar como incompleta
            </button>
            <button type="button" className="secondary-button" onClick={() => discardCurrentWorkout("home")}>
              Descartar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !template || !currentExercise) {
    return (
      <div ref={scrollContainerRef} className="flex h-full flex-col overflow-y-auto p-5">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-[#1F2937]">
                {mode === "free" ? "Entreno libre" : "Elijo rutina y arrancamos"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                Ketto guarda todo localmente para que despues puedas mirar historial y progreso.
              </p>
            </div>
          </div>

          {mode === "routine" ? (
            <button
              type="button"
              className="mt-4 w-full rounded-2xl border border-[#FFD5C2] bg-[#FFF7F3] px-4 py-3 text-sm font-bold text-[#FF8A5B] transition hover:bg-[#FFECE2]"
              onClick={() => setShowRoutineBuilder(true)}
            >
              Crear / editar rutinas
            </button>
          ) : null}
        </div>

        {mode === "free" ? (
          <button
            type="button"
            className="mt-4 rounded-2xl bg-[#FF8A5B] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#f97845]"
            onClick={beginFreeWorkout}
          >
            Empezar entreno libre
          </button>
        ) : templates.length > 0 ? (
          <div className="mt-4 grid gap-3">
            <SuggestedRoutineCard template={getSuggestedWorkoutTemplate(templates)} onStart={beginWorkout} />
            {templates.map((item) => (
              <WorkoutCard
                key={item.id}
                template={item}
                onStart={beginWorkout}
                onEdit={(routine) => {
                  setRoutineBuilderTemplateId(routine.id);
                  setShowRoutineBuilder(true);
                }}
                onDelete={setTemplateToDelete}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 text-center shadow-sm">
            <p className="text-base font-black text-[#1F2937]">No hay rutinas cargadas.</p>
            <p className="mt-2 text-sm text-[#6B7280]">Crea una rutina para empezar a entrenar con Ketto.</p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-[#FF8A5B] px-3 py-3 text-sm font-bold text-white"
              onClick={() => setShowRoutineBuilder(true)}
            >
              Crear rutina
            </button>
          </div>
        )}
        {templateToDelete ? (
          <ConfirmDeleteRoutineModal
            templateName={templateToDelete.name}
            onCancel={() => setTemplateToDelete(null)}
            onDelete={() => deleteTemplate(templateToDelete)}
          />
        ) : null}
      </div>
    );
  }

  const completedSets = session.sets.filter(
    (set) =>
      set.exerciseId === currentExercise.id &&
      set.blockId === currentStep.block.id &&
      set.roundNumber === currentStep.roundNumber,
  );
  const isFirstExercise = stepIndex === 0;
  const isLastExercise = stepIndex + 1 >= steps.length;
  const totalProgress = steps.length ? Math.round(((stepIndex + 1) / steps.length) * 100) : 0;
  const isTimedExercise = isTimeBasedExercise(currentExercise);

  return (
    <div ref={scrollContainerRef} className="flex h-full flex-col overflow-y-auto p-5">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#7C6CF2]">{template.name}</p>
            <p className="mt-1 text-sm font-bold text-[#FF8A5B]">
              Bloque {currentStep.blockIndex + 1}: {currentStep.block.name}
            </p>
            <h2 className="mt-1 text-xl font-black text-[#1F2937]">{currentExercise.name}</h2>
            <p className="mt-1 text-xs font-bold text-[#6B7280]">
              {getBlockTypeLabel(currentStep.block.type)} · Ronda {currentStep.roundNumber} de {currentStep.block.rounds} · Ejercicio {currentStep.exerciseIndex + 1} de {currentStep.block.exercises.length}
            </p>
          </div>
          <span className="rounded-full bg-[#E9E5FF] px-3 py-1 text-xs font-bold text-[#7C6CF2]">
            {stepIndex + 1}/{steps.length}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E9E5FF]">
          <div className="h-full rounded-full bg-[#FF8A5B]" style={{ width: `${totalProgress}%` }} />
        </div>

        <ExerciseMeta exercise={currentExercise} />

        <div className="mt-4 rounded-xl bg-[#F5F6FA] p-3 text-sm font-medium text-[#6B7280]">
          {suggestion?.lastSet ? (
            <span>
              Ultima marca: {formatSetValue(suggestion.lastSet)}
            </span>
          ) : currentExercise.previousWeightKg ? (
            <span>Marca previa: {currentExercise.previousWeightKg} kg</span>
          ) : (
            <span>Sin marca previa todavia.</span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <EditableMetricControl
          label="Peso"
          value={weightKg}
          suffix="kg"
          mode="decimal"
          onChange={setWeightKg}
        />
        {isTimedExercise ? (
          <EditableMetricControl label="Tiempo" value={timeSeconds} suffix="s" mode="integer" onChange={setTimeSeconds} />
        ) : (
          <EditableMetricControl label="Reps" value={reps} mode="integer" onChange={setReps} />
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-[#FFD5C2] bg-gradient-to-br from-[#FFF7F3] to-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#1F2937]">Descanso</p>
            <p className="mt-0.5 text-xs font-bold text-[#FF8A5B]">
              {restSecondsLeft > 0 ? getRestStatus(currentStep, steps[stepIndex + 1]) : "Listo para registrar"}
            </p>
          </div>
          <div className="flex gap-1">
            {restOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  defaultRestSeconds === option ? "bg-[#FF8A5B] text-white" : "bg-[#F5F6FA] text-[#6B7280]"
                }`}
                onClick={() => setDefaultRestSeconds(option)}
              >
                {option}s
              </button>
            ))}
          </div>
        </div>
        {restSecondsLeft > 0 ? (
          <div className="mt-3 rounded-2xl bg-white/80 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-4xl font-black text-[#FF8A5B]">{formatRestTime(restSecondsLeft)}</span>
              <span className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">descanso activo</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#FFD5C2]">
              <div
                className="h-full rounded-full bg-[#FF8A5B] transition-all"
                style={{ width: `${getRestProgress(restSecondsLeft, currentStep, steps[stepIndex + 1], defaultRestSeconds)}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button type="button" className="secondary-button !py-2" onClick={() => setIsRestPaused((value) => !value)}>
                {isRestPaused ? "Reanudar" : "Pausar"}
              </button>
              <button type="button" className="secondary-button !py-2" onClick={() => setRestSecondsLeft(0)}>
                Saltar
              </button>
              <button type="button" className="secondary-button !py-2" onClick={() => setRestSecondsLeft((value) => value + 30)}>
                +30s
              </button>
            </div>
          </div>
        ) : restDoneMessage ? (
          <p className="mt-3 rounded-xl bg-[#E9E5FF] px-3 py-2 text-sm font-bold text-[#7C6CF2]">{restDoneMessage}</p>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <QuickButton onClick={() => setWeightKg(suggestion?.weightKg ?? weightKg)}>Mismo peso</QuickButton>
        <QuickButton onClick={() => setWeightKg((value) => value + 2.5)}>+2.5 kg</QuickButton>
        <QuickButton onClick={() => setWeightKg((value) => Math.max(0, value - 2.5))}>-2.5 kg</QuickButton>
        {isTimedExercise ? (
          <>
            <QuickButton onClick={() => setTimeSeconds((value) => value + 10)}>+10s</QuickButton>
            <QuickButton onClick={() => setTimeSeconds((value) => Math.max(1, value - 10))}>-10s</QuickButton>
          </>
        ) : (
          <>
            <QuickButton onClick={() => setReps((value) => value + 1)}>+ rep</QuickButton>
            <QuickButton onClick={() => setReps((value) => Math.max(1, value - 1))}>- rep</QuickButton>
          </>
        )}
      </div>

      <button
        type="button"
        className="mt-4 rounded-2xl bg-[#FF8A5B] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#f97845]"
        onClick={confirmSet}
      >
        Confirmar serie
      </button>

      <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-[#1F2937]">Series cargadas</p>
        {completedSets.length > 0 ? (
          <div className="mt-3 space-y-2">
            {completedSets.map((set, index) => (
              <div key={set.id} className="flex justify-between rounded-xl bg-[#F5F6FA] px-3 py-2 text-sm font-medium text-[#1F2937]">
                <span>Serie {index + 1}</span>
                <span>{formatSetValue(set)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#6B7280]">Todavia no cargaste series de este ejercicio.</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-[#1F2937]">Nota del ejercicio</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {exerciseNotes.map((note) => (
            <NoteChip
              key={note}
              note={note}
              isSelected={(session.exerciseNotes ?? {})[currentExercise.id] === note}
              onClick={() => updateCurrentExerciseNote(note)}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          className="secondary-button disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isFirstExercise}
          onClick={goToPreviousExercise}
        >
          Ejercicio anterior
        </button>
        {!isLastExercise ? (
          <button
            type="button"
            className="rounded-xl bg-[#FF8A5B] px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#f97845]"
            onClick={goToNextExercise}
          >
            Siguiente ejercicio
          </button>
        ) : (
          <button
            type="button"
            className="rounded-xl bg-[#FF8A5B] px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#f97845]"
            onClick={handleFinish}
          >
            Finalizar rutina
          </button>
        )}
        <button type="button" className="text-sm font-bold text-[#6B7280] transition hover:text-[#E11D48]" onClick={handleDiscard}>
          Descartar rutina
        </button>
      </div>

      {showExitConfirm ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-[#1F2937]/20 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xl">
            <h3 className="text-lg font-black text-[#1F2937]">Rutina sin finalizar</h3>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">Tenes series cargadas. ¿Que queres hacer con este entrenamiento?</p>
            <div className="mt-4 grid gap-2">
              <button type="button" className="rounded-xl bg-[#FF8A5B] px-3 py-3 text-sm font-bold text-white" onClick={saveCurrentAsIncomplete}>
                Guardar como incompleta
              </button>
              <button type="button" className="secondary-button" onClick={() => discardCurrentWorkout()}>
                Descartar
              </button>
              <button type="button" className="secondary-button" onClick={() => setShowExitConfirm(false)}>
                Seguir entrenando
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExerciseMeta({ exercise }: { exercise: Exercise }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
      <span className="rounded-lg bg-[#F5F6FA] px-2 py-2 font-bold text-[#6B7280]">{exercise.muscleGroup}</span>
      <span className="rounded-lg bg-[#F5F6FA] px-2 py-2 font-bold text-[#6B7280]">
        {isTimeBasedExercise(exercise) ? `${getInitialTimeSeconds(exercise)}s` : `${exercise.targetRepsMin ?? 8}-${exercise.targetRepsMax ?? 12} reps`}
      </span>
      <span className="rounded-lg bg-[#F5F6FA] px-2 py-2 font-bold text-[#6B7280]">
        {exercise.suggestedWeightKg ?? exercise.previousWeightKg ? `${exercise.suggestedWeightKg ?? exercise.previousWeightKg} kg` : "Peso libre"}
      </span>
    </div>
  );
}

function SuggestedRoutineCard({
  template,
  onStart,
}: {
  template?: WorkoutTemplate;
  onStart: (template: WorkoutTemplate) => void;
}) {
  if (!template) {
    return null;
  }

  const lastSession = getLastSessionForTemplate(template.id);

  return (
    <article className="rounded-[22px] border-2 border-[#CBBFFF] bg-gradient-to-br from-[#F7F3FF] via-white to-[#F7F3FF] p-4 shadow-[0_14px_34px_rgba(124,108,242,0.12)]">
      <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wider text-[#7C6CF2] shadow-sm">
        Sugerida para hoy
      </div>
      <h3 className="mt-2 text-lg font-black text-[#1F2937]">{template.name}</h3>
      <p className="mt-1 text-sm font-medium text-[#6B7280]">{template.description ?? template.focus}</p>
      <p className="mt-3 text-xs font-bold text-[#6B7280]">
        {lastSession ? `Ultima vez: ${formatShortDate(lastSession.completedAt ?? lastSession.startedAt)}` : "Todavia no tiene historial"}
      </p>
      <button
        type="button"
        className="mt-4 w-full rounded-xl bg-[#7C6CF2] px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#6757E8]"
        onClick={() => onStart(template)}
      >
        Arrancar ahora
      </button>
    </article>
  );
}

function ConfirmDeleteRoutineModal({
  templateName,
  onCancel,
  onDelete,
}: {
  templateName: string;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#1F2937]/20 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xl">
        <h3 className="text-lg font-black text-[#1F2937]">Eliminar rutina</h3>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
          ¿Seguro que queres eliminar {templateName}? Esta accion no se puede deshacer.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="rounded-xl bg-[#E11D48] px-3 py-3 text-sm font-bold text-white" onClick={onDelete}>
            Eliminar rutina
          </button>
        </div>
      </div>
    </div>
  );
}

function EditableMetricControl({
  label,
  value,
  suffix,
  mode,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  mode: "decimal" | "integer";
  onChange: (value: number) => void;
}) {
  const skipBlurCommitRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!isEditing) {
      setDraft(String(value));
    }
  }, [isEditing, value]);

  function commitDraft() {
    const nextValue = parseMetricValue(draft, mode);

    if (nextValue !== null) {
      onChange(nextValue);
    } else {
      setDraft(String(value));
    }

    setIsEditing(false);
  }

  function cancelDraft() {
    skipBlurCommitRef.current = true;
    setDraft(String(value));
    setIsEditing(false);
  }

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
      <p className="text-xs font-bold text-[#6B7280]">{label}</p>
      {isEditing ? (
        <input
          className="mt-1 w-full rounded-xl border border-[#FFD5C2] bg-[#FFF7F3] px-2 py-1 text-xl font-black text-[#1F2937] outline-none focus:border-[#FF8A5B]"
          autoFocus
          inputMode={mode === "decimal" ? "decimal" : "numeric"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (skipBlurCommitRef.current) {
              skipBlurCommitRef.current = false;
              return;
            }

            commitDraft();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitDraft();
            }

            if (event.key === "Escape") {
              cancelDraft();
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="mt-1 block w-full cursor-text rounded-xl text-left text-xl font-black text-[#1F2937] outline-none transition hover:bg-[#F5F6FA]"
          onDoubleClick={() => {
            setDraft(String(value));
            setIsEditing(true);
          }}
          title="Doble click para editar"
        >
          {value}
          {suffix ? ` ${suffix}` : ""}
        </button>
      )}
    </div>
  );
}

function QuickButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-bold text-[#1F2937] shadow-sm transition hover:border-[#FFD5C2] hover:bg-[#FFF7F3]"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function NoteChip({ note, isSelected, onClick }: { note: string; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`rounded-full px-3 py-2 text-xs font-bold transition ${
        isSelected ? "bg-[#7C6CF2] text-white" : "bg-[#F5F6FA] text-[#6B7280] hover:bg-[#E9E5FF] hover:text-[#7C6CF2]"
      }`}
      onClick={onClick}
    >
      {note}
    </button>
  );
}

function WorkoutSummaryPanel({
  session,
  onSaveHome,
  onSaveHistory,
  onContinue,
}: {
  session: WorkoutSession;
  onSaveHome: () => void;
  onSaveHistory: () => void;
  onContinue: () => void;
}) {
  const summary = getWorkoutSummary(session);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="inline-flex rounded-full bg-[#E9E5FF] px-3 py-1 text-xs font-bold text-[#7C6CF2]">Resumen final</div>
        <h2 className="mt-4 text-xl font-black text-[#1F2937]">{session.templateName}</h2>
        <p className="mt-1 text-sm font-medium text-[#6B7280]">{formatDateTime(session.completedAt ?? new Date().toISOString())}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <SummaryMetric label="Duracion" value={summary.duration} />
        <SummaryMetric label="Ejercicios" value={String(summary.exerciseCount)} />
        <SummaryMetric label="Series" value={String(session.sets.length)} />
        <SummaryMetric label="Volumen" value={`${summary.volumeKg} kg`} />
      </div>

      <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-[#1F2937]">Mayor volumen</p>
        <p className="mt-2 text-sm text-[#6B7280]">{summary.topExercise ?? "Sin series cargadas"}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-[#1F2937]">Notas relevantes</p>
        {summary.relevantNotes.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.relevantNotes.map((note) => (
              <span key={note} className="rounded-full bg-[#FFF7F3] px-3 py-1 text-xs font-bold text-[#FF8A5B]">
                {note}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#6B7280]">Sin alertas relevantes.</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-[#1F2937]">Mejores marcas posibles</p>
        {summary.personalRecords.length ? (
          <div className="mt-3 space-y-2">
            {summary.personalRecords.map((record) => (
              <p key={record} className="rounded-xl bg-[#F5F6FA] px-3 py-2 text-sm font-bold text-[#1F2937]">
                {record}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#6B7280]">No se detectaron marcas nuevas todavia.</p>
        )}
      </div>

      <div className="mt-4 grid gap-2">
        <button type="button" className="rounded-xl bg-[#FF8A5B] px-3 py-3 text-sm font-bold text-white shadow-sm" onClick={onSaveHome}>
          Guardar y volver al inicio
        </button>
        <button type="button" className="secondary-button" onClick={onSaveHistory}>
          Ver historial
        </button>
        <button type="button" className="secondary-button" onClick={onContinue}>
          Continuar editando
        </button>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-[#6B7280]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#1F2937]">{value}</p>
    </div>
  );
}

function getWorkoutSummary(session: WorkoutSession) {
  const volumeByExercise = new Map<string, number>();
  const sessionBestByExercise = new Map<string, number>();
  const previousBestByExercise = new Map<string, number>();
  const exerciseNamesById = new Map<string, string>();
  const relevantNotes = new Set<string>();

  for (const historicalSet of loadWorkoutHistory().flatMap((historicalSession) => historicalSession.sets)) {
    const currentBest = previousBestByExercise.get(historicalSet.exerciseName) ?? 0;
    if (historicalSet.weightKg > currentBest) {
      previousBestByExercise.set(historicalSet.exerciseName, historicalSet.weightKg);
    }
  }

  for (const set of session.sets) {
    const volume = set.weightKg * set.reps;
    exerciseNamesById.set(set.exerciseId, set.exerciseName);
    volumeByExercise.set(set.exerciseName, (volumeByExercise.get(set.exerciseName) ?? 0) + volume);

    const currentBest = sessionBestByExercise.get(set.exerciseName) ?? 0;
    if (set.weightKg > currentBest) {
      sessionBestByExercise.set(set.exerciseName, set.weightKg);
    }

    if (set.note && ["Dolor/molestia", "Al fallo", "Pesado"].includes(set.note)) {
      relevantNotes.add(`${set.exerciseName}: ${set.note}`);
    }
  }

  for (const [exerciseId, note] of Object.entries(session.exerciseNotes ?? {})) {
    if (["Molestia", "Muy pesado", "Mejorar técnica"].includes(note)) {
      relevantNotes.add(`${exerciseNamesById.get(exerciseId) ?? "Ejercicio"}: ${note}`);
    }
  }

  const topExercise = Array.from(volumeByExercise.entries()).sort((a, b) => b[1] - a[1])[0];

  return {
    duration: formatDuration(new Date(session.startedAt), new Date(session.completedAt ?? new Date().toISOString())),
    exerciseCount: new Set(session.sets.map((set) => set.exerciseId)).size,
    volumeKg: getSessionVolume(session),
    topExercise: topExercise ? `${topExercise[0]} (${topExercise[1]} kg)` : undefined,
    personalRecords: Array.from(sessionBestByExercise.entries())
      .filter(([exercise, weight]) => weight > (previousBestByExercise.get(exercise) ?? 0))
      .map(([exercise, weight]) => `${exercise}: ${weight} kg`),
    relevantNotes: Array.from(relevantNotes),
  };
}

function formatRestTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function buildWorkoutSteps(template: WorkoutTemplate): WorkoutStep[] {
  return (template.blocks ?? []).flatMap((block, blockIndex) =>
    Array.from({ length: block.rounds }, (_, roundIndex) =>
      block.exercises.map((exercise, exerciseIndex) => ({
        block,
        blockIndex,
        roundNumber: roundIndex + 1,
        exercise,
        exerciseIndex,
      })),
    ).flat(),
  );
}

function findFirstPendingStepIndex(steps: WorkoutStep[], session: WorkoutSession) {
  const pendingIndex = steps.findIndex(
    (step) =>
      !session.sets.some(
        (set) =>
          set.exerciseId === step.exercise.id &&
          set.blockId === step.block.id &&
          set.roundNumber === step.roundNumber,
      ),
  );

  return pendingIndex >= 0 ? pendingIndex : Math.max(0, steps.length - 1);
}

function isTimeBasedExercise(exercise: Exercise) {
  return Boolean(
    exercise.targetTimeSeconds ||
      exercise.exerciseType === "time" ||
      exercise.exerciseType === "cardio" ||
      exercise.exerciseType === "mobility",
  );
}

function getInitialTimeSeconds(exercise: Exercise) {
  return Math.max(1, exercise.targetTimeSeconds ?? 30);
}

function formatSetValue(set: Pick<WorkoutSet, "weightKg" | "reps" | "timeSeconds">) {
  const weightLabel = set.weightKg > 0 ? `${set.weightKg} kg x ` : "";
  return set.timeSeconds ? `${weightLabel}${set.timeSeconds}s` : `${set.weightKg} kg x ${set.reps}`;
}

function getBlockTypeLabel(type: WorkoutBlock["type"]) {
  if (type === "superset") {
    return "Superserie";
  }

  if (type === "circuit") {
    return "Circuito";
  }

  return "Ejercicio simple";
}

function getRestStatus(currentStep: WorkoutStep, nextStep?: WorkoutStep) {
  if (!nextStep) {
    return "Último descanso";
  }

  const sameRound = nextStep.block.id === currentStep.block.id && nextStep.roundNumber === currentStep.roundNumber;
  return sameRound ? "Próximo ejercicio" : "Próxima ronda";
}

function getRestProgress(secondsLeft: number, currentStep: WorkoutStep, nextStep: WorkoutStep | undefined, fallback: number) {
  const sameRound = nextStep?.block.id === currentStep.block.id && nextStep.roundNumber === currentStep.roundNumber;
  const total = sameRound ? currentStep.block.restBetweenExercisesSeconds ?? fallback : currentStep.block.restAfterRoundSeconds ?? fallback;
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, ((total - secondsLeft) / total) * 100));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function formatDuration(start: Date, end: Date) {
  const totalMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  return `${totalMinutes} min`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function parseMetricValue(value: string, mode: "decimal" | "integer") {
  const trimmedValue = value.trim().replace(",", ".");

  if (mode === "integer") {
    if (!/^\d+$/.test(trimmedValue)) {
      return null;
    }

    const parsed = Number.parseInt(trimmedValue, 10);
    return parsed > 0 ? parsed : null;
  }

  if (!/^\d+(\.\d+)?$/.test(trimmedValue)) {
    return null;
  }

  const parsed = Number.parseFloat(trimmedValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
