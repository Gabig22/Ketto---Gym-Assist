import type { WorkoutSession } from "../types";

const HISTORY_KEY = "ketto.workoutHistory.v1";

export function loadWorkoutHistory(): WorkoutSession[] {
  try {
    const rawHistory = localStorage.getItem(HISTORY_KEY);

    if (!rawHistory) {
      return [];
    }

    const parsed = JSON.parse(rawHistory);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWorkoutHistory(history: WorkoutSession[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function addWorkoutToHistory(session: WorkoutSession) {
  const history = loadWorkoutHistory();
  saveWorkoutHistory([session, ...history]);
}
