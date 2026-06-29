import type { WorkoutSession } from "../types";

const ACTIVE_SESSION_KEY = "ketto.activeWorkoutSession.v1";
const ACTIVE_STATE_KEY = "ketto.activeWorkoutState.v1";

export interface ActiveWorkoutState {
  currentStepIndex: number;
  currentWeightKg: number;
  currentReps: number;
  currentTimeSeconds?: number;
  restSecondsLeft: number;
  isRestPaused: boolean;
}

export function loadActiveWorkoutSession(): WorkoutSession | null {
  try {
    const rawSession = localStorage.getItem(ACTIVE_SESSION_KEY);
    return rawSession ? (JSON.parse(rawSession) as WorkoutSession) : null;
  } catch {
    return null;
  }
}

export function saveActiveWorkoutSession(session: WorkoutSession) {
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
}

export function clearActiveWorkoutSession() {
  localStorage.removeItem(ACTIVE_SESSION_KEY);
  clearActiveWorkoutState();
}

export function loadActiveWorkoutState(): ActiveWorkoutState | null {
  try {
    const rawState = localStorage.getItem(ACTIVE_STATE_KEY);
    return rawState ? (JSON.parse(rawState) as ActiveWorkoutState) : null;
  } catch {
    return null;
  }
}

export function saveActiveWorkoutState(state: ActiveWorkoutState) {
  localStorage.setItem(ACTIVE_STATE_KEY, JSON.stringify(state));
}

export function clearActiveWorkoutState() {
  localStorage.removeItem(ACTIVE_STATE_KEY);
}
