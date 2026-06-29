import type { WorkoutSession } from "../types";

const ACTIVE_SESSION_KEY = "ketto.activeWorkoutSession.v1";

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
}
