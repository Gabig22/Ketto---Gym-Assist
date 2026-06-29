import type { ExerciseLibraryItem } from "../types";

const EXERCISE_LIBRARY_KEY = "ketto.exerciseLibrary.v1";

export const defaultExerciseLibrary: ExerciseLibraryItem[] = [
  { id: "bench-press", name: "Press banca", bodyGroup: "Pecho", primaryMuscle: "Pectoral", equipment: "Barra", type: "strength" },
  { id: "incline-dumbbell-press", name: "Press inclinado con mancuernas", bodyGroup: "Pecho", primaryMuscle: "Pectoral superior", equipment: "Mancuernas", type: "strength" },
  { id: "lat-pulldown", name: "Jalon al pecho", bodyGroup: "Espalda", primaryMuscle: "Dorsal", equipment: "Polea", type: "strength" },
  { id: "seated-row", name: "Remo sentado", bodyGroup: "Espalda", primaryMuscle: "Dorsal", equipment: "Polea", type: "strength" },
  { id: "shoulder-press", name: "Press militar", bodyGroup: "Hombros", primaryMuscle: "Deltoides", equipment: "Mancuernas", type: "strength" },
  { id: "barbell-curl", name: "Curl con barra", bodyGroup: "Biceps", primaryMuscle: "Biceps", equipment: "Barra", type: "strength" },
  { id: "triceps-pushdown", name: "Extension de triceps en polea", bodyGroup: "Triceps", primaryMuscle: "Triceps", equipment: "Polea", type: "strength" },
  { id: "squat", name: "Sentadilla", bodyGroup: "Piernas", primaryMuscle: "Cuadriceps", equipment: "Barra", type: "strength" },
  { id: "leg-press", name: "Prensa", bodyGroup: "Piernas", primaryMuscle: "Cuadriceps", equipment: "Maquina", type: "strength" },
  { id: "hip-thrust", name: "Hip thrust", bodyGroup: "Gluteos", primaryMuscle: "Gluteo mayor", equipment: "Barra", type: "strength" },
  { id: "plank", name: "Plancha", bodyGroup: "Core", primaryMuscle: "Abdominales", equipment: "Peso corporal", type: "time" },
  { id: "push-ups", name: "Flexiones", bodyGroup: "Cardio / Funcional", primaryMuscle: "Pecho", equipment: "Peso corporal", type: "strength" },
  { id: "jumping-jacks", name: "Jumping jacks", bodyGroup: "Cardio / Funcional", primaryMuscle: "Full body", equipment: "Peso corporal", type: "cardio" },
  { id: "hamstring-stretch", name: "Estiramiento isquios", bodyGroup: "Movilidad / Estiramiento", primaryMuscle: "Isquios", equipment: "Mat", type: "mobility" },
];

export function loadExerciseLibrary(): ExerciseLibraryItem[] {
  try {
    const rawLibrary = localStorage.getItem(EXERCISE_LIBRARY_KEY);

    if (!rawLibrary) {
      return defaultExerciseLibrary;
    }

    const parsed = JSON.parse(rawLibrary);
    return Array.isArray(parsed) ? parsed : defaultExerciseLibrary;
  } catch {
    return defaultExerciseLibrary;
  }
}

export function saveExerciseLibrary(library: ExerciseLibraryItem[]) {
  localStorage.setItem(EXERCISE_LIBRARY_KEY, JSON.stringify(library));
}
