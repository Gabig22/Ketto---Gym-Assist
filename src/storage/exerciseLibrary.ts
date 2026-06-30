import type { ExerciseLibraryItem } from "../types";

const EXERCISE_LIBRARY_KEY = "ketto.exerciseLibrary.v1";

export const defaultExerciseLibrary: ExerciseLibraryItem[] = [
  { id: "bench-press", name: "Press banca", bodyGroup: "Pecho", primaryMuscle: "Pectoral", equipment: "Barra", equipmentIds: ["barbell", "flat-bench"], type: "strength" },
  { id: "incline-dumbbell-press", name: "Press inclinado con mancuernas", bodyGroup: "Pecho", primaryMuscle: "Pectoral superior", equipment: "Banco inclinado, Mancuernas", equipmentIds: ["incline-bench", "dumbbells"], type: "strength" },
  { id: "lat-pulldown", name: "Jalon al pecho", bodyGroup: "Espalda", primaryMuscle: "Dorsal", equipment: "Polea", equipmentIds: ["pulley"], type: "strength" },
  { id: "seated-row", name: "Remo sentado", bodyGroup: "Espalda", primaryMuscle: "Dorsal", equipment: "Polea", equipmentIds: ["pulley"], type: "strength" },
  { id: "shoulder-press", name: "Press militar", bodyGroup: "Hombros", primaryMuscle: "Deltoides", equipment: "Mancuernas", equipmentIds: ["dumbbells"], type: "strength" },
  { id: "barbell-curl", name: "Curl con barra", bodyGroup: "Biceps", primaryMuscle: "Biceps", equipment: "Barra", equipmentIds: ["barbell"], type: "strength" },
  { id: "triceps-pushdown", name: "Extension de triceps en polea", bodyGroup: "Triceps", primaryMuscle: "Triceps", equipment: "Polea", equipmentIds: ["pulley"], type: "strength" },
  { id: "squat", name: "Sentadilla", bodyGroup: "Piernas", primaryMuscle: "Cuadriceps", equipment: "Barra", equipmentIds: ["barbell"], type: "strength" },
  { id: "leg-press", name: "Prensa", bodyGroup: "Piernas", primaryMuscle: "Cuadriceps", equipment: "Maquina", equipmentIds: ["machine"], type: "strength" },
  { id: "hip-thrust", name: "Hip thrust", bodyGroup: "Gluteos", primaryMuscle: "Gluteo mayor", equipment: "Barra, Banco plano", equipmentIds: ["barbell", "flat-bench"], type: "strength" },
  { id: "plank", name: "Plancha", bodyGroup: "Core", primaryMuscle: "Abdominales", equipment: "Colchoneta, Peso corporal", equipmentIds: ["mat", "bodyweight"], type: "time" },
  { id: "push-ups", name: "Flexiones", bodyGroup: "Cardio / Funcional", primaryMuscle: "Pecho", equipment: "Peso corporal", equipmentIds: ["bodyweight"], type: "strength" },
  { id: "jumping-jacks", name: "Jumping jacks", bodyGroup: "Cardio / Funcional", primaryMuscle: "Full body", equipment: "Peso corporal", equipmentIds: ["bodyweight"], type: "cardio" },
  { id: "hamstring-stretch", name: "Estiramiento isquios", bodyGroup: "Movilidad / Estiramiento", primaryMuscle: "Isquios", equipment: "Colchoneta", equipmentIds: ["mat"], type: "mobility" },
];

export function loadExerciseLibrary(): ExerciseLibraryItem[] {
  try {
    const rawLibrary = localStorage.getItem(EXERCISE_LIBRARY_KEY);

    if (!rawLibrary) {
      return defaultExerciseLibrary;
    }

    const parsed = JSON.parse(rawLibrary);
    return Array.isArray(parsed) ? parsed.map(normalizeExerciseLibraryItem) : defaultExerciseLibrary;
  } catch {
    return defaultExerciseLibrary;
  }
}

export function saveExerciseLibrary(library: ExerciseLibraryItem[]) {
  localStorage.setItem(EXERCISE_LIBRARY_KEY, JSON.stringify(library.map(normalizeExerciseLibraryItem)));
}

function normalizeExerciseLibraryItem(item: ExerciseLibraryItem): ExerciseLibraryItem {
  return {
    ...item,
    equipmentIds: item.equipmentIds ?? [],
    equipment: item.equipment ?? "",
    type: item.type ?? "strength",
  };
}
