import type { WorkoutTemplate } from "../types";

const TEMPLATES_KEY = "ketto.workoutTemplates.v1";

export function loadStoredWorkoutTemplates(): WorkoutTemplate[] | null {
  try {
    const rawTemplates = localStorage.getItem(TEMPLATES_KEY);

    if (!rawTemplates) {
      return null;
    }

    const parsed = JSON.parse(rawTemplates);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredWorkoutTemplates(templates: WorkoutTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}
