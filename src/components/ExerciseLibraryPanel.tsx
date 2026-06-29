import { useMemo, useState } from "react";
import type { ExerciseLibraryItem } from "../types";
import { loadExerciseLibrary, saveExerciseLibrary } from "../storage/exerciseLibrary";

const bodyGroups = [
  "Pecho",
  "Espalda",
  "Hombros",
  "Biceps",
  "Triceps",
  "Piernas",
  "Gluteos",
  "Core",
  "Cardio / Funcional",
  "Movilidad / Estiramiento",
];

const exerciseTypes: Array<{ value: NonNullable<ExerciseLibraryItem["type"]>; label: string }> = [
  { value: "strength", label: "Fuerza" },
  { value: "time", label: "Tiempo" },
  { value: "cardio", label: "Cardio" },
  { value: "mobility", label: "Movilidad" },
];

export default function ExerciseLibraryPanel() {
  const [library, setLibrary] = useState<ExerciseLibraryItem[]>(() => loadExerciseLibrary());
  const [selectedId, setSelectedId] = useState(library[0]?.id ?? "");
  const selectedExercise = library.find((exercise) => exercise.id === selectedId) ?? createEmptyExercise();
  const [draft, setDraft] = useState<ExerciseLibraryItem>(selectedExercise);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  const filteredLibrary = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return library;
    }

    return library.filter((exercise) =>
      [exercise.name, exercise.bodyGroup, exercise.primaryMuscle, exercise.equipment, exercise.type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [library, query]);

  function selectExercise(exercise: ExerciseLibraryItem) {
    setSelectedId(exercise.id);
    setDraft(exercise);
    setMessage("");
  }

  function createExercise() {
    const nextExercise = createEmptyExercise();
    setLibrary((current) => [nextExercise, ...current]);
    setSelectedId(nextExercise.id);
    setDraft(nextExercise);
    setMessage("Nuevo ejercicio creado. Completa los datos y guarda.");
  }

  function saveDraft() {
    if (!draft.name.trim() || !draft.bodyGroup.trim() || !draft.primaryMuscle.trim()) {
      setMessage("Completa nombre, grupo corporal y musculo principal.");
      return;
    }

    const nextExercise = {
      ...draft,
      name: draft.name.trim(),
      bodyGroup: draft.bodyGroup.trim(),
      primaryMuscle: draft.primaryMuscle.trim(),
    };
    const nextLibrary = library.some((exercise) => exercise.id === nextExercise.id)
      ? library.map((exercise) => (exercise.id === nextExercise.id ? nextExercise : exercise))
      : [nextExercise, ...library];

    setLibrary(nextLibrary);
    saveExerciseLibrary(nextLibrary);
    setMessage("Biblioteca guardada.");
  }

  function deleteDraft() {
    const nextLibrary = library.filter((exercise) => exercise.id !== draft.id);
    const nextSelected = nextLibrary[0] ?? createEmptyExercise();

    setLibrary(nextLibrary);
    saveExerciseLibrary(nextLibrary);
    setSelectedId(nextSelected.id);
    setDraft(nextSelected);
    setMessage("Ejercicio eliminado.");
  }

  return (
    <section className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-[#1F2937]">Biblioteca de ejercicios</h3>
          <p className="mt-1 text-sm text-[#6B7280]">Reutiliza ejercicios al crear rutinas.</p>
        </div>
        <button type="button" className="secondary-button shrink-0 !py-2" onClick={createExercise}>
          Nuevo
        </button>
      </div>

      <input
        className="field-input mt-4"
        placeholder="Buscar ejercicio, musculo o equipo"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {filteredLibrary.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${
              exercise.id === draft.id ? "bg-[#7C6CF2] text-white" : "bg-[#F5F6FA] text-[#1F2937] hover:bg-[#E9E5FF]"
            }`}
            onClick={() => selectExercise(exercise)}
          >
            {exercise.name}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        <label className="field-label">
          Nombre
          <input className="field-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <label className="field-label">
          Grupo corporal
          <select className="field-input" value={draft.bodyGroup} onChange={(event) => setDraft({ ...draft, bodyGroup: event.target.value })}>
            {bodyGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Musculo principal
          <input className="field-input" value={draft.primaryMuscle} onChange={(event) => setDraft({ ...draft, primaryMuscle: event.target.value })} />
        </label>
        <label className="field-label">
          Equipamiento
          <input className="field-input" value={draft.equipment ?? ""} onChange={(event) => setDraft({ ...draft, equipment: event.target.value })} />
        </label>
        <label className="field-label">
          Tipo
          <select className="field-input" value={draft.type ?? "strength"} onChange={(event) => setDraft({ ...draft, type: event.target.value as ExerciseLibraryItem["type"] })}>
            {exerciseTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Notas
          <input className="field-input" value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </label>
      </div>

      {message ? <p className="mt-3 rounded-xl bg-[#E9E5FF] px-3 py-2 text-sm font-bold text-[#7C6CF2]">{message}</p> : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className="secondary-button" onClick={deleteDraft}>
          Eliminar
        </button>
        <button type="button" className="rounded-xl bg-[#FF8A5B] px-3 py-3 text-sm font-bold text-white shadow-sm" onClick={saveDraft}>
          Guardar
        </button>
      </div>
    </section>
  );
}

function createEmptyExercise(): ExerciseLibraryItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    bodyGroup: "Pecho",
    primaryMuscle: "",
    equipment: "",
    type: "strength",
    notes: "",
  };
}

export { bodyGroups, exerciseTypes };
