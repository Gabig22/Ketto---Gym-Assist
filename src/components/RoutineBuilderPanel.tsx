import { useMemo, useState } from "react";
import type { Exercise, ExerciseLibraryItem, WorkoutBlock, WorkoutBlockType, WorkoutTemplate } from "../types";
import { normalizeWorkoutTemplate, saveWorkoutTemplates } from "../services/workoutService";
import { bodyGroups } from "./ExerciseLibraryPanel";
import { loadExerciseLibrary, saveExerciseLibrary } from "../storage/exerciseLibrary";

interface RoutineBuilderPanelProps {
  templates: WorkoutTemplate[];
  initialTemplateId?: string;
  onSaved: (templates: WorkoutTemplate[]) => void;
  onBack: () => void;
}

export default function RoutineBuilderPanel({ templates, initialTemplateId, onSaved, onBack }: RoutineBuilderPanelProps) {
  const normalizedTemplates = useMemo(() => templates.map(normalizeWorkoutTemplate), [templates]);
  const [localTemplates, setLocalTemplates] = useState<WorkoutTemplate[]>(normalizedTemplates);
  const [selectedId, setSelectedId] = useState(initialTemplateId ?? normalizedTemplates[0]?.id ?? "");
  const selectedTemplate = localTemplates.find((template) => template.id === selectedId);
  const [draft, setDraft] = useState<WorkoutTemplate>(() => normalizeWorkoutTemplate(selectedTemplate ?? createEmptyTemplate()));
  const [message, setMessage] = useState("");
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibraryItem[]>(() => loadExerciseLibrary());
  const [selectorTarget, setSelectorTarget] = useState<{ blockIndex: number; exerciseIndex: number } | null>(null);
  const [expandedBlockIds, setExpandedBlockIds] = useState<string[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockNameDraft, setBlockNameDraft] = useState("");
  const [showDeleteRoutineConfirm, setShowDeleteRoutineConfirm] = useState(false);

  const canSave =
    draft.name.trim().length > 0 &&
    (draft.description ?? draft.focus).trim().length > 0 &&
    Boolean(draft.blocks?.length) &&
    (draft.blocks ?? []).every(isValidBlock);

  function selectTemplate(template: WorkoutTemplate) {
    const normalizedTemplate = normalizeWorkoutTemplate(template);
    setSelectedId(template.id);
    setDraft(normalizedTemplate);
    setMessage("");
  }

  function createRoutine() {
    const nextTemplate = createEmptyTemplate();
    setLocalTemplates((current) => [...current, nextTemplate]);
    setSelectedId(nextTemplate.id);
    setDraft(nextTemplate);
    setMessage("Rutina nueva creada. Completa los datos y guarda.");
  }

  function updateBlock(index: number, updates: Partial<WorkoutBlock>) {
    setDraft((current) => ({
      ...current,
      blocks: (current.blocks ?? []).map((block, blockIndex) => (blockIndex === index ? { ...block, ...updates } : block)),
    }));
  }

  function addBlock() {
    setDraft((current) => ({
      ...current,
      blocks: [...(current.blocks ?? []), createEmptyBlock()],
    }));
  }

  function removeBlock(index: number) {
    setDraft((current) => ({
      ...current,
      blocks: (current.blocks ?? []).filter((_, blockIndex) => blockIndex !== index),
    }));
  }

  function addExercise(blockIndex: number) {
    const blocks = draft.blocks ?? [];
    updateBlock(blockIndex, {
      exercises: [...(blocks[blockIndex]?.exercises ?? []), createEmptyExercise()],
    });
  }

  function updateExercise(blockIndex: number, exerciseIndex: number, updates: Partial<Exercise>) {
    const block = draft.blocks?.[blockIndex];

    if (!block) {
      return;
    }

    updateBlock(blockIndex, {
      exercises: block.exercises.map((exercise, index) => (index === exerciseIndex ? { ...exercise, ...updates } : exercise)),
    });
  }

  function moveExercise(blockIndex: number, exerciseIndex: number, direction: -1 | 1) {
    const block = draft.blocks?.[blockIndex];
    const nextIndex = exerciseIndex + direction;

    if (!block || nextIndex < 0 || nextIndex >= block.exercises.length) {
      return;
    }

    const nextExercises = [...block.exercises];
    const [exercise] = nextExercises.splice(exerciseIndex, 1);
    nextExercises.splice(nextIndex, 0, exercise);
    updateBlock(blockIndex, { exercises: nextExercises });
  }

  function removeExercise(blockIndex: number, exerciseIndex: number) {
    const block = draft.blocks?.[blockIndex];

    if (!block) {
      return;
    }

    updateBlock(blockIndex, {
      exercises: block.exercises.filter((_, index) => index !== exerciseIndex),
    });
  }

  function saveDraft() {
    if (!canSave) {
      setMessage("Revisa rutina, bloques y ejercicios antes de guardar.");
      return;
    }

    const savedTemplate = normalizeWorkoutTemplate({
      ...draft,
      focus: draft.description ?? draft.focus,
      exercises: (draft.blocks ?? []).flatMap((block) => block.exercises),
    });
    const nextTemplates = localTemplates.some((template) => template.id === savedTemplate.id)
      ? localTemplates.map((template) => (template.id === savedTemplate.id ? savedTemplate : template))
      : [...localTemplates, savedTemplate];

    setLocalTemplates(nextTemplates);
    saveWorkoutTemplates(nextTemplates);
    onSaved(nextTemplates);
    setMessage("Cambios guardados.");
  }

  function deleteCurrentRoutine() {
    const nextTemplates = localTemplates.filter((template) => template.id !== draft.id);
    const nextDraft = nextTemplates[0] ? normalizeWorkoutTemplate(nextTemplates[0]) : createEmptyTemplate();

    setLocalTemplates(nextTemplates);
    saveWorkoutTemplates(nextTemplates);
    onSaved(nextTemplates);
    setDraft(nextDraft);
    setSelectedId(nextDraft.id);
    setShowDeleteRoutineConfirm(false);
    setMessage(nextTemplates.length ? "Rutina eliminada." : "Rutina eliminada. No quedan rutinas guardadas.");
    onBack();
  }

  function toggleBlockConfig(blockId: string) {
    setExpandedBlockIds((current) =>
      current.includes(blockId) ? current.filter((id) => id !== blockId) : [...current, blockId],
    );
  }

  function startEditingBlockName(block: WorkoutBlock) {
    setEditingBlockId(block.id);
    setBlockNameDraft(block.name);
  }

  function commitBlockName(blockIndex: number, fallbackName: string) {
    const nextName = blockNameDraft.trim() || fallbackName;
    updateBlock(blockIndex, { name: nextName });
    setEditingBlockId(null);
    setBlockNameDraft("");
  }

  function cancelBlockName() {
    setEditingBlockId(null);
    setBlockNameDraft("");
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[#1F2937]">Crear / editar rutinas</h2>
          <p className="mt-1 text-sm text-[#6B7280]">Rutinas con ejercicios simples, superseries y circuitos.</p>
        </div>
        <button type="button" className="secondary-button shrink-0" onClick={onBack}>
          Volver
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {localTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold transition ${
                template.id === selectedId ? "bg-[#FF8A5B] text-white" : "bg-[#F5F6FA] text-[#1F2937] hover:bg-[#E9E5FF]"
              }`}
              onClick={() => selectTemplate(template)}
            >
              {template.name || "Sin nombre"}
            </button>
          ))}
          <button type="button" className="shrink-0 rounded-xl border border-[#FFD5C2] bg-[#FFF7F3] px-3 py-2 text-sm font-bold text-[#FF8A5B]" onClick={createRoutine}>
            Nueva
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <label className="field-label">
          Nombre de rutina
          <input className="field-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <label className="field-label mt-3">
          Descripcion corta
          <input
            className="field-input"
            value={draft.description ?? draft.focus}
            onChange={(event) => setDraft({ ...draft, description: event.target.value, focus: event.target.value })}
          />
        </label>
      </div>

      <button
        type="button"
        className="mt-3 w-full rounded-xl border border-[#FECACA] bg-[#FFF1F2] px-3 py-2 text-sm font-bold text-[#E11D48]"
        onClick={() => setShowDeleteRoutineConfirm(true)}
      >
        Eliminar rutina
      </button>

      <div className="mt-4 space-y-3">
        {(draft.blocks ?? []).map((block, blockIndex) => (
          <article key={block.id} className="rounded-[22px] border-2 border-[#E9E5FF] bg-[#FBFAFF] p-4 shadow-sm">
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[#7C6CF2]">Bloque {blockIndex + 1}</p>
                  {editingBlockId === block.id ? (
                    <input
                      className="mt-1 w-full rounded-xl border border-[#CBBFFF] bg-[#F7F3FF] px-2 py-1 text-base font-black text-[#1F2937] outline-none"
                      autoFocus
                      value={blockNameDraft}
                      onChange={(event) => setBlockNameDraft(event.target.value)}
                      onBlur={() => commitBlockName(blockIndex, block.name)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          commitBlockName(blockIndex, block.name);
                        }

                        if (event.key === "Escape") {
                          cancelBlockName();
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="mt-1 block text-left text-base font-black text-[#1F2937]"
                      onDoubleClick={() => startEditingBlockName(block)}
                      title="Doble click para editar"
                    >
                      {block.name || "Bloque sin nombre"}
                    </button>
                  )}
                </div>
                <span className="rounded-full bg-[#E9E5FF] px-3 py-1 text-xs font-black text-[#7C6CF2]">
                  {getBlockTypeLabel(block.type)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#6B7280]">
                <span className="rounded-xl bg-[#F5F6FA] px-3 py-2">{block.rounds} rondas</span>
                <span className="rounded-xl bg-[#F5F6FA] px-3 py-2">{block.restAfterRoundSeconds}s descanso</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <button type="button" className="text-sm font-bold text-[#7C6CF2]" onClick={() => toggleBlockConfig(block.id)}>
                  {expandedBlockIds.includes(block.id) ? "Ocultar configuracion" : "Configurar bloque"}
                </button>
                <button type="button" className="text-sm font-bold text-[#E11D48]" onClick={() => removeBlock(blockIndex)}>
                  Eliminar bloque
                </button>
              </div>
            </div>

            {expandedBlockIds.includes(block.id) ? (
            <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
              <label className="field-label">
                Tipo
                <select className="field-input" value={block.type} onChange={(event) => updateBlock(blockIndex, { type: event.target.value as WorkoutBlockType })}>
                  <option value="single">Ejercicio simple</option>
                  <option value="superset">Superserie</option>
                  <option value="circuit">Circuito / ronda</option>
                </select>
              </label>
              <label className="field-label">
                Rondas
                <input className="field-input" type="number" min="1" value={block.rounds} onChange={(event) => updateBlock(blockIndex, { rounds: positiveInt(event.target.value, block.rounds) })} />
              </label>
              <label className="field-label">
                Descanso ronda
                <input
                  className="field-input"
                  type="number"
                  min="0"
                  value={block.restAfterRoundSeconds}
                  onChange={(event) => updateBlock(blockIndex, { restAfterRoundSeconds: positiveInt(event.target.value, block.restAfterRoundSeconds) })}
                />
              </label>
              <label className="field-label">
                Descanso ejercicios
                <input
                  className="field-input"
                  type="number"
                  min="0"
                  value={block.restBetweenExercisesSeconds ?? ""}
                  onChange={(event) =>
                    updateBlock(blockIndex, {
                      restBetweenExercisesSeconds: event.target.value === "" ? undefined : positiveInt(event.target.value, block.restBetweenExercisesSeconds ?? 0),
                    })
                  }
                />
              </label>
            </div>
            ) : null}

            <div className="mt-5 space-y-3 border-l-2 border-[#E9E5FF] pl-3">
              {block.exercises.map((exercise, exerciseIndex) => (
                <div key={exercise.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-[#FF8A5B]">Ejercicio {exerciseIndex + 1}</p>
                      <p className="mt-1 text-sm font-black text-[#1F2937]">{exercise.name || "Elegir ejercicio"}</p>
                    </div>
                    <div className="flex gap-2 text-xs font-bold">
                      <button type="button" className="text-[#7C6CF2]" onClick={() => moveExercise(blockIndex, exerciseIndex, -1)}>
                        Subir
                      </button>
                      <button type="button" className="text-[#7C6CF2]" onClick={() => moveExercise(blockIndex, exerciseIndex, 1)}>
                        Bajar
                      </button>
                      <button type="button" className="text-[#E11D48]" onClick={() => removeExercise(blockIndex, exerciseIndex)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-3 w-full rounded-xl border border-[#FFD5C2] bg-[#FFF7F3] px-3 py-3 text-left text-sm font-bold text-[#1F2937]"
                    onClick={() => setSelectorTarget({ blockIndex, exerciseIndex })}
                  >
                    {exercise.name ? `${exercise.name} · ${exercise.muscleGroup}` : "Seleccionar ejercicio"}
                  </button>
                  <label className="field-label mt-3">
                    Grupo muscular
                    <input className="field-input" value={exercise.muscleGroup} onChange={(event) => updateExercise(blockIndex, exerciseIndex, { muscleGroup: event.target.value })} />
                  </label>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="field-label">
                      Reps min
                      <input className="field-input" type="number" min="1" value={exercise.targetRepsMin ?? 8} onChange={(event) => updateExercise(blockIndex, exerciseIndex, { targetRepsMin: positiveInt(event.target.value, exercise.targetRepsMin ?? 8) })} />
                    </label>
                    <label className="field-label">
                      Reps max
                      <input className="field-input" type="number" min="1" value={exercise.targetRepsMax ?? 12} onChange={(event) => updateExercise(blockIndex, exerciseIndex, { targetRepsMax: positiveInt(event.target.value, exercise.targetRepsMax ?? 12) })} />
                    </label>
                    <label className="field-label">
                      Tiempo seg
                      <input className="field-input" type="number" min="0" value={exercise.targetTimeSeconds ?? ""} onChange={(event) => updateExercise(blockIndex, exerciseIndex, { targetTimeSeconds: event.target.value === "" ? undefined : positiveInt(event.target.value, exercise.targetTimeSeconds ?? 0) })} />
                    </label>
                    <label className="field-label">
                      Peso sugerido
                      <input className="field-input" type="number" min="0" step="0.5" value={exercise.suggestedWeightKg ?? exercise.previousWeightKg ?? ""} onChange={(event) => updateExercise(blockIndex, exerciseIndex, { suggestedWeightKg: event.target.value === "" ? undefined : positiveNumber(event.target.value, exercise.suggestedWeightKg ?? 0), previousWeightKg: event.target.value === "" ? undefined : positiveNumber(event.target.value, exercise.previousWeightKg ?? 0) })} />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="mt-3 w-full rounded-xl border border-[#FFD5C2] bg-[#FFF7F3] px-3 py-2 text-sm font-bold text-[#FF8A5B]" onClick={() => addExercise(blockIndex)}>
              Agregar ejercicio al bloque
            </button>
          </article>
        ))}
      </div>

      <button type="button" className="mt-4 rounded-2xl border border-[#FFD5C2] bg-[#FFF7F3] px-4 py-3 text-sm font-bold text-[#FF8A5B]" onClick={addBlock}>
        Agregar bloque
      </button>

      {message ? <p className="mt-3 rounded-xl bg-[#E9E5FF] px-3 py-2 text-sm font-bold text-[#7C6CF2]">{message}</p> : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className="secondary-button" onClick={onBack}>
          Cancelar
        </button>
        <button
          type="button"
          className="rounded-xl bg-[#FF8A5B] px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#f97845] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSave}
          onClick={saveDraft}
        >
          Guardar cambios
        </button>
      </div>

      {selectorTarget ? (
        <ExerciseSelectorModal
          library={exerciseLibrary}
          onClose={() => setSelectorTarget(null)}
          onCreate={(item) => {
            const nextLibrary = [item, ...exerciseLibrary];
            setExerciseLibrary(nextLibrary);
            saveExerciseLibrary(nextLibrary);
            updateExerciseFromLibrary(selectorTarget.blockIndex, selectorTarget.exerciseIndex, item);
            setSelectorTarget(null);
          }}
          onSelect={(item) => {
            updateExerciseFromLibrary(selectorTarget.blockIndex, selectorTarget.exerciseIndex, item);
            setSelectorTarget(null);
          }}
        />
      ) : null}
      {showDeleteRoutineConfirm ? (
        <ConfirmDeleteRoutineModal
          routineName={draft.name}
          onCancel={() => setShowDeleteRoutineConfirm(false)}
          onDelete={deleteCurrentRoutine}
        />
      ) : null}
    </div>
  );

  function updateExerciseFromLibrary(blockIndex: number, exerciseIndex: number, item: ExerciseLibraryItem) {
    updateExercise(blockIndex, exerciseIndex, {
      id: item.id,
      name: item.name,
      muscleGroup: item.bodyGroup,
      equipment: item.equipment,
      bodyGroup: item.bodyGroup,
      primaryMuscle: item.primaryMuscle,
      exerciseType: item.type,
      notes: item.notes,
      targetRepsMin: item.targetRepsMin,
      targetRepsMax: item.targetRepsMax,
      targetTimeSeconds: item.targetTimeSeconds,
      suggestedWeightKg: item.suggestedWeightKg,
      previousWeightKg: item.suggestedWeightKg,
    });
  }
}

function createEmptyTemplate(): WorkoutTemplate {
  const block = createEmptyBlock();
  return {
    id: crypto.randomUUID(),
    name: "Nueva rutina",
    description: "Descripcion corta",
    focus: "Descripcion corta",
    exercises: block.exercises,
    blocks: [block],
  };
}

function createEmptyBlock(): WorkoutBlock {
  return {
    id: crypto.randomUUID(),
    name: "Bloque principal",
    type: "single",
    rounds: 3,
    restAfterRoundSeconds: 90,
    exercises: [createEmptyExercise()],
  };
}

function createEmptyExercise(): Exercise {
  return {
    id: crypto.randomUUID(),
    name: "",
    muscleGroup: "",
    targetSets: 1,
    repRange: "8-12",
    targetRepsMin: 8,
    targetRepsMax: 12,
  };
}

function isValidBlock(block: WorkoutBlock) {
  return (
    block.name.trim().length > 0 &&
    block.rounds > 0 &&
    block.restAfterRoundSeconds >= 0 &&
    block.exercises.length > 0 &&
    block.exercises.every(
      (exercise) => exercise.name.trim().length > 0 && exercise.muscleGroup.trim().length > 0,
    )
  );
}

function positiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function positiveNumber(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getBlockTypeLabel(type: WorkoutBlockType) {
  if (type === "superset") {
    return "Superserie";
  }

  if (type === "circuit") {
    return "Circuito";
  }

  return "Ejercicio simple";
}

function ExerciseSelectorModal({
  library,
  onClose,
  onSelect,
  onCreate,
}: {
  library: ExerciseLibraryItem[];
  onClose: () => void;
  onSelect: (item: ExerciseLibraryItem) => void;
  onCreate: (item: ExerciseLibraryItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("Todos");
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState("");
  const [newEquipment, setNewEquipment] = useState("");
  const filteredLibrary = library.filter((item) => {
    const matchesGroup = group === "Todos" || item.bodyGroup === group;
    const matchesQuery = [item.name, item.bodyGroup, item.primaryMuscle, item.equipment]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query.trim().toLowerCase()));

    return matchesGroup && (!query.trim() || matchesQuery);
  });

  function createAndSelect() {
    if (!newName.trim()) {
      return;
    }

    onCreate({
      id: crypto.randomUUID(),
      name: newName.trim(),
      bodyGroup: group === "Todos" ? "Pecho" : group,
      primaryMuscle: newMuscle.trim() || (group === "Todos" ? "General" : group),
      equipment: newEquipment.trim(),
      type: "strength",
    });
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#1F2937]/20 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[#1F2937]">Seleccionar ejercicio</h3>
            <p className="mt-1 text-sm text-[#6B7280]">Busca en la biblioteca o crea uno nuevo.</p>
          </div>
          <button type="button" className="secondary-button !py-2" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          <input className="field-input" placeholder="Buscar por nombre, musculo o equipo" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="field-input" value={group} onChange={(event) => setGroup(event.target.value)}>
            <option value="Todos">Todos los grupos</option>
            {bodyGroups.map((bodyGroup) => (
              <option key={bodyGroup} value={bodyGroup}>
                {bodyGroup}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {filteredLibrary.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F5F6FA] p-3 text-left transition hover:border-[#FFD5C2] hover:bg-[#FFF7F3]"
              onClick={() => onSelect(item)}
            >
              <span className="block text-sm font-black text-[#1F2937]">{item.name}</span>
              <span className="mt-1 block text-xs font-bold text-[#6B7280]">
                {item.bodyGroup} · {item.primaryMuscle}
                {item.equipment ? ` · ${item.equipment}` : ""}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-[#FBFAFF] p-3">
          <p className="text-sm font-black text-[#1F2937]">Crear ejercicio rapido</p>
          <input className="field-input mt-2" placeholder="Nombre nuevo" value={newName} onChange={(event) => setNewName(event.target.value)} />
          <input className="field-input mt-2" placeholder="Equipamiento" value={newEquipment} onChange={(event) => setNewEquipment(event.target.value)} />
          <input className="field-input mt-2" placeholder="Musculo principal" value={newMuscle} onChange={(event) => setNewMuscle(event.target.value)} />
          <button type="button" className="mt-3 w-full rounded-xl bg-[#FF8A5B] px-3 py-3 text-sm font-bold text-white" onClick={createAndSelect}>
            Crear y seleccionar
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteRoutineModal({
  routineName,
  onCancel,
  onDelete,
}: {
  routineName: string;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#1F2937]/20 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xl">
        <h3 className="text-lg font-black text-[#1F2937]">Eliminar rutina</h3>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
          ¿Seguro que queres eliminar {routineName}? Esta accion no se puede deshacer.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="rounded-xl bg-[#E11D48] px-3 py-3 text-sm font-bold text-white" onClick={onDelete}>
            Eliminar rutina
          </button>
        </div>
      </div>
    </div>
  );
}
