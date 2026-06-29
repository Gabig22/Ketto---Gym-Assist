import type { Exercise, ProgressSummary, WorkoutBlock, WorkoutSession, WorkoutSet, WorkoutTemplate } from "../types";
import { addWorkoutToHistory, loadWorkoutHistory } from "../storage/workoutHistory";
import {
  clearActiveWorkoutSession,
  loadActiveWorkoutSession,
  saveActiveWorkoutSession,
} from "../storage/workoutSession";
import { loadStoredWorkoutTemplates, saveStoredWorkoutTemplates } from "../storage/workoutTemplates";

export const defaultWorkoutTemplates: WorkoutTemplate[] = [
  {
    id: "day-a",
    name: "Rutina Dia A",
    focus: "Pecho + Triceps",
    exercises: [
      {
        id: "bench-press",
        name: "Press banca",
        muscleGroup: "Pecho",
        targetSets: 4,
        repRange: "8-10",
        previousWeightKg: 55,
      },
      {
        id: "incline-dumbbell-press",
        name: "Press inclinado con mancuernas",
        muscleGroup: "Pecho",
        targetSets: 3,
        repRange: "10-12",
        previousWeightKg: 22.5,
      },
      {
        id: "triceps-pushdown",
        name: "Extension de triceps en polea",
        muscleGroup: "Triceps",
        targetSets: 3,
        repRange: "10-12",
        previousWeightKg: 35,
      },
    ],
  },
  {
    id: "day-b",
    name: "Rutina Dia B",
    focus: "Espalda + Biceps",
    exercises: [
      {
        id: "lat-pulldown",
        name: "Jalon al pecho",
        muscleGroup: "Espalda",
        targetSets: 4,
        repRange: "8-12",
        previousWeightKg: 50,
      },
      {
        id: "seated-row",
        name: "Remo sentado",
        muscleGroup: "Espalda",
        targetSets: 3,
        repRange: "10-12",
        previousWeightKg: 45,
      },
      {
        id: "barbell-curl",
        name: "Curl con barra",
        muscleGroup: "Biceps",
        targetSets: 3,
        repRange: "8-10",
        previousWeightKg: 25,
      },
    ],
  },
  {
    id: "day-c",
    name: "Rutina Dia C",
    focus: "Piernas + Core",
    exercises: [
      {
        id: "squat",
        name: "Sentadilla",
        muscleGroup: "Piernas",
        targetSets: 4,
        repRange: "6-8",
        previousWeightKg: 70,
      },
      {
        id: "leg-press",
        name: "Prensa",
        muscleGroup: "Piernas",
        targetSets: 3,
        repRange: "10-12",
        previousWeightKg: 120,
      },
      {
        id: "plank",
        name: "Plancha",
        muscleGroup: "Core",
        targetSets: 3,
        repRange: "30-45 seg",
      },
    ],
  },
];

export function getWorkoutTemplates() {
  const storedTemplates = loadStoredWorkoutTemplates();
  return (storedTemplates === null ? defaultWorkoutTemplates : storedTemplates).map(normalizeWorkoutTemplate);
}

export function saveWorkoutTemplates(templates: WorkoutTemplate[]) {
  const normalizedTemplates = templates.map(normalizeWorkoutTemplate);
  saveStoredWorkoutTemplates(normalizedTemplates);
  return normalizedTemplates;
}

export function startWorkout(template: WorkoutTemplate): WorkoutSession {
  const session: WorkoutSession = {
    id: crypto.randomUUID(),
    templateId: template.id,
    templateName: template.name,
    startedAt: new Date().toISOString(),
    status: "incomplete",
    exerciseNotes: {},
    sets: [],
  };

  saveActiveWorkoutSession(session);
  return session;
}

export function getActiveWorkout() {
  return loadActiveWorkoutSession();
}

export function addSetToWorkout(session: WorkoutSession, set: Omit<WorkoutSet, "id" | "completedAt">) {
  const nextSession: WorkoutSession = {
    ...session,
    sets: [
      ...session.sets,
      {
        ...set,
        id: crypto.randomUUID(),
        completedAt: new Date().toISOString(),
      },
    ],
  };

  saveActiveWorkoutSession(nextSession);
  return nextSession;
}

export function updateWorkoutExerciseNote(session: WorkoutSession, exerciseId: string, note: string) {
  const nextSession: WorkoutSession = {
    ...session,
    exerciseNotes: {
      ...(session.exerciseNotes ?? {}),
      [exerciseId]: note,
    },
  };

  saveActiveWorkoutSession(nextSession);
  return nextSession;
}

export function finishWorkout(session: WorkoutSession) {
  const completedSession = {
    ...session,
    completedAt: new Date().toISOString(),
    status: "complete" as const,
    durationSeconds: getDurationSeconds(session.startedAt),
    totalVolumeKg: getSessionVolume(session),
  };

  addWorkoutToHistory(completedSession);
  clearActiveWorkoutSession();
  return completedSession;
}

export function saveIncompleteWorkout(session: WorkoutSession) {
  const incompleteSession = {
    ...session,
    completedAt: new Date().toISOString(),
    status: "incomplete" as const,
    durationSeconds: getDurationSeconds(session.startedAt),
    totalVolumeKg: getSessionVolume(session),
  };

  addWorkoutToHistory(incompleteSession);
  clearActiveWorkoutSession();
  return incompleteSession;
}

export function discardActiveWorkout() {
  clearActiveWorkoutSession();
}

export function findLastSetForExercise(exerciseId: string): WorkoutSet | undefined {
  const history = loadWorkoutHistory();

  return history.flatMap((session) => session.sets).find((set) => set.exerciseId === exerciseId);
}

export function getSuggestedStart(exercise: Exercise) {
  const lastSet = findLastSetForExercise(exercise.id);

  return {
    weightKg: lastSet?.weightKg ?? exercise.suggestedWeightKg ?? exercise.previousWeightKg ?? 0,
    reps: exercise.targetRepsMin ?? Number(exercise.repRange.match(/\d+/)?.[0] ?? 10),
    lastSet,
  };
}

export function getProgressSummary(): ProgressSummary {
  const history = loadWorkoutHistory();
  const totalSets = history.reduce((total, session) => total + session.sets.length, 0);
  const volumeBySession = history.map((session) => ({
    sessionId: session.id,
    date: session.completedAt ?? session.startedAt,
    templateName: session.templateName,
    volumeKg: getSessionVolume(session),
  }));

  return {
    lastWorkout: history[0],
    totalSets,
    biggestImprovement: getBiggestImprovement(history),
    volumeBySession,
  };
}

export function getSessionVolume(session: WorkoutSession) {
  return session.sets.reduce((total, set) => total + set.weightKg * set.reps, 0);
}

export function normalizeWorkoutTemplate(template: WorkoutTemplate): WorkoutTemplate {
  const blocks = template.blocks?.length
    ? template.blocks.map(normalizeWorkoutBlock)
    : template.exercises.map((exercise) => ({
        id: `${exercise.id}-block`,
        name: exercise.name,
        type: "single" as const,
        rounds: Math.max(1, exercise.targetSets || 1),
        restAfterRoundSeconds: 90,
        exercises: [normalizeExercise(exercise)],
      }));

  return {
    ...template,
    description: template.description ?? template.focus,
    focus: template.focus || template.description || "",
    exercises: blocks.flatMap((block) => block.exercises),
    blocks,
  };
}

export function getTemplateStats(template: WorkoutTemplate) {
  const normalizedTemplate = normalizeWorkoutTemplate(template);
  const blocks = normalizedTemplate.blocks ?? [];
  const exerciseCount = new Set(blocks.flatMap((block) => block.exercises.map((exercise) => exercise.id))).size;
  const totalRounds = blocks.reduce((total, block) => total + block.rounds, 0);
  const estimatedSets = blocks.reduce((total, block) => total + block.rounds * block.exercises.length, 0);

  return {
    exerciseCount,
    totalRounds,
    estimatedSets,
    blockCount: blocks.length,
  };
}

export function getLastSessionForTemplate(templateId: string) {
  return loadWorkoutHistory().find((session) => session.templateId === templateId);
}

export function getSuggestedWorkoutTemplate(templates: WorkoutTemplate[]) {
  const normalizedTemplates = templates.map(normalizeWorkoutTemplate);
  const history = loadWorkoutHistory();

  if (!normalizedTemplates.length) {
    return undefined;
  }

  const lastTemplateId = history[0]?.templateId;
  const lastIndex = normalizedTemplates.findIndex((template) => template.id === lastTemplateId);

  if (lastIndex === -1) {
    return normalizedTemplates[0];
  }

  return normalizedTemplates[(lastIndex + 1) % normalizedTemplates.length];
}

function normalizeWorkoutBlock(block: WorkoutBlock): WorkoutBlock {
  return {
    ...block,
    rounds: Math.max(1, block.rounds || 1),
    restAfterRoundSeconds: block.restAfterRoundSeconds || 90,
    exercises: block.exercises.map(normalizeExercise),
  };
}

function normalizeExercise(exercise: Exercise): Exercise {
  const reps = parseRepRange(exercise.repRange);

  return {
    ...exercise,
    targetSets: Math.max(1, exercise.targetSets || 1),
    targetRepsMin: exercise.targetRepsMin ?? reps[0],
    targetRepsMax: exercise.targetRepsMax ?? reps[1],
    suggestedWeightKg: exercise.suggestedWeightKg ?? exercise.previousWeightKg,
    repRange: exercise.repRange || `${reps[0]}-${reps[1]}`,
  };
}

function parseRepRange(repRange: string) {
  const matches = repRange.match(/\d+/g)?.map(Number) ?? [];
  return [matches[0] ?? 8, matches[1] ?? matches[0] ?? 12];
}

function getDurationSeconds(startedAt: string) {
  return Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
}

function getBiggestImprovement(history: WorkoutSession[]): ProgressSummary["biggestImprovement"] {
  const setsByExercise = new Map<string, WorkoutSet[]>();

  for (const set of history.flatMap((session) => session.sets).reverse()) {
    const sets = setsByExercise.get(set.exerciseId) ?? [];
    sets.push(set);
    setsByExercise.set(set.exerciseId, sets);
  }

  let bestImprovement: ProgressSummary["biggestImprovement"];

  for (const sets of setsByExercise.values()) {
    if (sets.length < 2) {
      continue;
    }

    const firstBest = Math.max(...sets.slice(0, -1).map((set) => set.weightKg));
    const currentBest = Math.max(...sets.map((set) => set.weightKg));
    const improvement = currentBest - firstBest;

    if (improvement > 0 && (!bestImprovement || improvement > bestImprovement.currentBestKg - bestImprovement.previousBestKg)) {
      bestImprovement = {
        exerciseName: sets[0].exerciseName,
        previousBestKg: firstBest,
        currentBestKg: currentBest,
      };
    }
  }

  return bestImprovement;
}
