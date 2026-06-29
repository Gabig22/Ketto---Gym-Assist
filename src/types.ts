export type AssistantView =
  | "home"
  | "routine"
  | "routine-builder"
  | "free"
  | "progress"
  | "history"
  | "settings";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  bodyGroup?: string;
  primaryMuscle?: string;
  equipment?: string;
  exerciseType?: "strength" | "time" | "cardio" | "mobility";
  targetSets: number;
  repRange: string;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetTimeSeconds?: number;
  previousWeightKg?: number;
  suggestedWeightKg?: number;
  notes?: string;
}

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  bodyGroup: string;
  primaryMuscle: string;
  equipment?: string;
  type?: "strength" | "time" | "cardio" | "mobility";
  notes?: string;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetTimeSeconds?: number;
  suggestedWeightKg?: number;
}

export type WorkoutBlockType = "single" | "superset" | "circuit";

export interface WorkoutBlock {
  id: string;
  name: string;
  type: WorkoutBlockType;
  rounds: number;
  restAfterRoundSeconds: number;
  restBetweenExercisesSeconds?: number;
  exercises: Exercise[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  focus: string;
  exercises: Exercise[];
  blocks?: WorkoutBlock[];
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  exerciseName: string;
  blockId?: string;
  blockName?: string;
  blockType?: WorkoutBlockType;
  roundNumber?: number;
  weightKg: number;
  reps: number;
  timeSeconds?: number;
  note?: string;
  effort?: string;
  completedAt: string;
}

export interface WorkoutSession {
  id: string;
  templateId: string;
  templateName: string;
  startedAt: string;
  completedAt?: string;
  status?: "complete" | "incomplete";
  exerciseNotes?: Record<string, string>;
  durationSeconds?: number;
  totalVolumeKg?: number;
  sets: WorkoutSet[];
}

export interface ProgressSummary {
  lastWorkout?: WorkoutSession;
  totalSets: number;
  biggestImprovement?: {
    exerciseName: string;
    previousBestKg: number;
    currentBestKg: number;
  };
  volumeBySession: Array<{
    sessionId: string;
    date: string;
    templateName: string;
    volumeKg: number;
  }>;
}
