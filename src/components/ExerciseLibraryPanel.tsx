import { useMemo, useState } from "react";
import type { ExerciseLibraryItem, GymEquipmentItem } from "../types";
import { loadExerciseLibrary, saveExerciseLibrary } from "../storage/exerciseLibrary";
import { createGymEquipmentFromName, loadGymEquipment, saveGymEquipment } from "../storage/gymEquipment";

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
  const [equipment, setEquipment] = useState<GymEquipmentItem[]>(() => loadGymEquipment());
  const [selectedId, setSelectedId] = useState(library[0]?.id ?? "");
  const selectedExercise = library.find((exercise) => exercise.id === selectedId) ?? createEmptyExercise();
  const [draft, setDraft] = useState<ExerciseLibraryItem>(selectedExercise);
  const [query, setQuery] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickEquipment, setQuickEquipment] = useState("");
  const [message, setMessage] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Pecho"]);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(selectedExercise);

  const filteredLibrary = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return library;
    }

    return library.filter((exercise) =>
      [exercise.name, exercise.bodyGroup, exercise.primaryMuscle, getEquipmentLabel(exercise, equipment), exercise.type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [equipment, library, query]);
  const groupedLibrary = useMemo(() => groupExercisesByBodyGroup(filteredLibrary), [filteredLibrary]);
  const visibleGroupNames = groupedLibrary.map((group) => group.name);

  function selectExercise(exercise: ExerciseLibraryItem) {
    if (hasUnsavedChanges) {
      setShowUnsavedConfirm(true);
      return;
    }

    setSelectedId(exercise.id);
    setDraft(exercise);
    setMessage("");
  }

  function createExercise() {
    if (hasUnsavedChanges) {
      setShowUnsavedConfirm(true);
      return;
    }

    const nextExercise = createEmptyExercise();
    setLibrary((current) => [nextExercise, ...current]);
    setSelectedId(nextExercise.id);
    setDraft(nextExercise);
    setMessage("Nuevo ejercicio creado. Completa los datos y guarda.");
  }

  function createQuickExercise() {
    if (!quickName.trim()) {
      setMessage("Escribi el nombre del ejercicio.");
      return;
    }

    const equipmentResult = ensureEquipmentByName(quickEquipment.trim(), equipment);
    const nextEquipment = equipmentResult.equipment;
    const nextExercise: ExerciseLibraryItem = {
      ...createEmptyExercise(),
      name: quickName.trim(),
      bodyGroup: "Pecho",
      primaryMuscle: "General",
      equipment: equipmentResult.item ? equipmentResult.item.name : quickEquipment.trim(),
      equipmentIds: equipmentResult.item ? [equipmentResult.item.id] : [],
    };
    const nextLibrary = [nextExercise, ...library];

    setEquipment(nextEquipment);
    saveGymEquipment(nextEquipment);
    setLibrary(nextLibrary);
    saveExerciseLibrary(nextLibrary);
    setSelectedId(nextExercise.id);
    setDraft(nextExercise);
    setQuickName("");
    setQuickEquipment("");
    setMessage("Ejercicio rapido creado. Podes completar los detalles.");
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
      equipment: getEquipmentLabel(draft, equipment),
    };
    const nextLibrary = library.some((exercise) => exercise.id === nextExercise.id)
      ? library.map((exercise) => (exercise.id === nextExercise.id ? nextExercise : exercise))
      : [nextExercise, ...library];

    setLibrary(nextLibrary);
    saveExerciseLibrary(nextLibrary);
    setDraft(nextExercise);
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

  function toggleEquipment(equipmentId: string) {
    const currentIds = draft.equipmentIds ?? [];
    const nextIds = currentIds.includes(equipmentId)
      ? currentIds.filter((id) => id !== equipmentId)
      : [...currentIds, equipmentId];
    const nextDraft = { ...draft, equipmentIds: nextIds };

    setDraft({
      ...nextDraft,
      equipment: getEquipmentLabel(nextDraft, equipment),
    });
  }

  function createEquipmentForDraft(name: string) {
    if (!name.trim()) {
      return;
    }

    const result = ensureEquipmentByName(name.trim(), equipment);
    setEquipment(result.equipment);
    saveGymEquipment(result.equipment);

    if (result.item) {
      const nextDraft = {
        ...draft,
        equipmentIds: Array.from(new Set([...(draft.equipmentIds ?? []), result.item.id])),
      };
      setDraft({ ...nextDraft, equipment: getEquipmentLabel(nextDraft, result.equipment) });
    }
  }

  function discardChanges() {
    setDraft(selectedExercise);
    setShowUnsavedConfirm(false);
  }

  function toggleGroup(groupName: string) {
    setExpandedGroups((current) =>
      current.includes(groupName) ? current.filter((name) => name !== groupName) : [...current, groupName],
    );
  }

  function expandAllGroups() {
    setExpandedGroups(visibleGroupNames);
  }

  function collapseAllGroups() {
    setExpandedGroups([]);
  }

  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-[#7C6CF2]">Ajustes &gt; Biblioteca de ejercicios</p>
          <h3 className="text-base font-black text-[#1F2937]">Biblioteca de ejercicios</h3>
          <p className="mt-1 text-sm text-[#6B7280]">Reutiliza ejercicios al crear rutinas.</p>
        </div>
        <button type="button" className="secondary-button shrink-0 !py-2" onClick={createExercise}>
          Nuevo
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-[#FFD5C2] bg-[#FFF7F3] p-3">
        <p className="text-sm font-black text-[#1F2937]">Crear ejercicio rapido</p>
        <div className="mt-3 grid gap-2">
          <input className="field-input" placeholder="Nombre del ejercicio" value={quickName} onChange={(event) => setQuickName(event.target.value)} />
          <input className="field-input" placeholder="Elemento/equipamiento usado" value={quickEquipment} onChange={(event) => setQuickEquipment(event.target.value)} />
          <button type="button" className="rounded-xl bg-[#FF8A5B] px-3 py-3 text-sm font-bold text-white" onClick={createQuickExercise}>
            Crear y editar detalles
          </button>
        </div>
      </div>

      <input
        className="field-input mt-4"
        placeholder="Buscar ejercicio, musculo o equipo"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {library.length === 0 ? (
        <EmptyState
          title="Todavia no hay ejercicios cargados."
          text="Crea tu primer ejercicio o usa la biblioteca inicial para empezar mas rapido."
          action="Crear ejercicio"
          onAction={createExercise}
        />
      ) : (
        <div className="mt-3 grid gap-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">{filteredLibrary.length} ejercicios</p>
            <div className="flex gap-2">
              <button type="button" className="text-xs font-black text-[#7C6CF2]" onClick={expandAllGroups}>
                Expandir todo
              </button>
              <button type="button" className="text-xs font-black text-[#6B7280]" onClick={collapseAllGroups}>
                Contraer
              </button>
            </div>
          </div>

          {groupedLibrary.map((group) => {
            const isExpanded = expandedGroups.includes(group.name) || query.trim().length > 0;

            return (
              <div key={group.name} className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F5F6FA]">
                <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-[#FFF7F3]" onClick={() => toggleGroup(group.name)}>
                  <span>
                    <span className="block text-sm font-black text-[#1F2937]">{group.name}</span>
                    <span className="mt-0.5 block text-xs font-bold text-[#6B7280]">{group.exercises.length} ejercicios</span>
                  </span>
                  <span className="text-lg font-black text-[#7C6CF2]">{isExpanded ? "-" : "+"}</span>
                </button>

                {isExpanded ? (
                  <div className="grid gap-1 border-t border-[#E5E7EB] bg-white p-2">
                    {group.exercises.map((exercise) => (
                      <button
                        key={exercise.id}
                        type="button"
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          exercise.id === draft.id ? "border-[#7C6CF2] bg-[#F7F3FF]" : "border-[#E5E7EB] bg-white hover:border-[#FFD5C2] hover:bg-[#FFF7F3]"
                        }`}
                        onClick={() => selectExercise(exercise)}
                      >
                        <span className="block text-sm font-black text-[#1F2937]">{exercise.name || "Ejercicio sin nombre"}</span>
                        <span className="mt-0.5 block text-xs font-bold text-[#6B7280]">
                          {exercise.primaryMuscle} · {getEquipmentLabel(exercise, equipment) || "Sin elemento"} · {getExerciseTypeLabel(exercise.type)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          {false && filteredLibrary.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              className={`rounded-2xl border p-3 text-left transition ${
                exercise.id === draft.id ? "border-[#7C6CF2] bg-[#F7F3FF]" : "border-[#E5E7EB] bg-[#F5F6FA] hover:border-[#FFD5C2] hover:bg-[#FFF7F3]"
              }`}
              onClick={() => selectExercise(exercise)}
            >
              <span className="block text-sm font-black text-[#1F2937]">{exercise.name || "Ejercicio sin nombre"}</span>
              <span className="mt-1 block text-xs font-bold text-[#6B7280]">
                {exercise.bodyGroup} · {exercise.primaryMuscle} · {getEquipmentLabel(exercise, equipment) || "Sin elemento"} · {getExerciseTypeLabel(exercise.type)}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3 rounded-2xl border border-[#E5E7EB] bg-[#FBFAFF] p-3">
        <p className="text-sm font-black text-[#1F2937]">Editar ejercicio</p>
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
          Elementos
          <div className="mt-2 flex flex-wrap gap-2">
            {equipment.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rounded-full px-3 py-2 text-xs font-black transition ${
                  (draft.equipmentIds ?? []).includes(item.id) ? "bg-[#7C6CF2] text-white" : "bg-white text-[#6B7280] hover:bg-[#E9E5FF]"
                }`}
                onClick={() => toggleEquipment(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <input
            className="field-input mt-2"
            placeholder="Agregar elemento nuevo"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                createEquipmentForDraft(event.currentTarget.value);
                event.currentTarget.value = "";
              }
            }}
          />
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

      {showUnsavedConfirm ? (
        <UnsavedChangesModal
          onSave={saveDraft}
          onDiscard={discardChanges}
          onContinue={() => setShowUnsavedConfirm(false)}
        />
      ) : null}
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
    equipmentIds: [],
    type: "strength",
    notes: "",
  };
}

function ensureEquipmentByName(name: string, currentEquipment: GymEquipmentItem[]) {
  if (!name) {
    return { equipment: currentEquipment, item: undefined };
  }

  const existingItem = currentEquipment.find((item) => item.name.toLowerCase() === name.toLowerCase());

  if (existingItem) {
    return { equipment: currentEquipment, item: existingItem };
  }

  const nextItem = createGymEquipmentFromName(name);
  return { equipment: [nextItem, ...currentEquipment], item: nextItem };
}

function getEquipmentLabel(exercise: ExerciseLibraryItem, equipment: GymEquipmentItem[]) {
  const ids = exercise.equipmentIds ?? [];
  const names = ids
    .map((id) => equipment.find((item) => item.id === id)?.name)
    .filter(Boolean);

  return names.length ? names.join(", ") : exercise.equipment ?? "";
}

function getExerciseTypeLabel(type?: ExerciseLibraryItem["type"]) {
  return exerciseTypes.find((item) => item.value === type)?.label ?? "Fuerza";
}

function groupExercisesByBodyGroup(exercises: ExerciseLibraryItem[]) {
  const groups = new Map<string, ExerciseLibraryItem[]>();

  for (const group of bodyGroups) {
    groups.set(group, []);
  }

  for (const exercise of exercises) {
    const groupName = exercise.bodyGroup || "Otros";
    groups.set(groupName, [...(groups.get(groupName) ?? []), exercise]);
  }

  return Array.from(groups.entries())
    .map(([name, groupExercises]) => ({
      name,
      exercises: groupExercises.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((group) => group.exercises.length > 0);
}

function EmptyState({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-[#FFD5C2] bg-[#FFF7F3] p-4 text-center">
      <p className="text-sm font-black text-[#1F2937]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#6B7280]">{text}</p>
      <button type="button" className="mt-3 rounded-xl bg-[#FF8A5B] px-3 py-3 text-sm font-bold text-white" onClick={onAction}>
        {action}
      </button>
    </div>
  );
}

function UnsavedChangesModal({
  onSave,
  onDiscard,
  onContinue,
}: {
  onSave: () => void;
  onDiscard: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#1F2937]/20 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xl">
        <h3 className="text-lg font-black text-[#1F2937]">Tenes cambios sin guardar.</h3>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">Que queres hacer?</p>
        <div className="mt-4 grid gap-2">
          <button type="button" className="rounded-xl bg-[#FF8A5B] px-3 py-3 text-sm font-bold text-white" onClick={onSave}>
            Guardar cambios
          </button>
          <button type="button" className="secondary-button" onClick={onDiscard}>
            Salir sin guardar
          </button>
          <button type="button" className="secondary-button" onClick={onContinue}>
            Seguir editando
          </button>
        </div>
      </div>
    </div>
  );
}

export { bodyGroups, exerciseTypes };
