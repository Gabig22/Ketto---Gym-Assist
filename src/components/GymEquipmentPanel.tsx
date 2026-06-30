import { useMemo, useState } from "react";
import type { GymEquipmentItem } from "../types";
import { createGymEquipmentFromName, loadGymEquipment, saveGymEquipment } from "../storage/gymEquipment";

const equipmentTypes = [
  "Mancuernas",
  "Kettlebell",
  "Barra",
  "Discos",
  "Banco",
  "Colchoneta",
  "Banda",
  "Polea",
  "Maquina",
  "Peso corporal",
  "Cardio",
  "Accesorio",
  "Otros",
];

export default function GymEquipmentPanel() {
  const [equipment, setEquipment] = useState<GymEquipmentItem[]>(() => loadGymEquipment());
  const [selectedId, setSelectedId] = useState(equipment[0]?.id ?? "");
  const selectedItem = equipment.find((item) => item.id === selectedId) ?? createEmptyEquipment();
  const [draft, setDraft] = useState<GymEquipmentItem>(selectedItem);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Peso corporal", "Mancuernas"]);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(selectedItem);

  const filteredEquipment = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return equipment;
    }

    return equipment.filter((item) =>
      [item.name, item.type, item.weightRange, item.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [equipment, query]);
  const groupedEquipment = useMemo(() => groupEquipmentByCategory(filteredEquipment), [filteredEquipment]);
  const visibleGroupNames = groupedEquipment.map((group) => group.name);

  function selectItem(item: GymEquipmentItem) {
    if (hasUnsavedChanges) {
      setShowUnsavedConfirm(true);
      return;
    }

    setSelectedId(item.id);
    setDraft(item);
    setMessage("");
  }

  function createItem() {
    if (hasUnsavedChanges) {
      setShowUnsavedConfirm(true);
      return;
    }

    const nextItem = createEmptyEquipment();
    setEquipment((current) => [nextItem, ...current]);
    setSelectedId(nextItem.id);
    setDraft(nextItem);
    setMessage("Elemento nuevo creado. Completa los datos y guarda.");
  }

  function saveDraft() {
    if (!draft.name.trim() || !draft.type.trim()) {
      setMessage("Completa nombre y tipo de elemento.");
      return;
    }

    const nextItem = {
      ...draft,
      name: draft.name.trim(),
      type: draft.type.trim(),
      weightRange: draft.weightRange?.trim(),
      unit: draft.unit?.trim() || "kg",
      notes: draft.notes?.trim(),
    };
    const nextEquipment = equipment.some((item) => item.id === nextItem.id)
      ? equipment.map((item) => (item.id === nextItem.id ? nextItem : item))
      : [nextItem, ...equipment];

    setEquipment(nextEquipment);
    saveGymEquipment(nextEquipment);
    setSelectedId(nextItem.id);
    setDraft(nextItem);
    setMessage("Mi gimnasio guardado.");
  }

  function deleteDraft() {
    const nextEquipment = equipment.filter((item) => item.id !== draft.id);
    const nextSelected = nextEquipment[0] ?? createEmptyEquipment();

    setEquipment(nextEquipment);
    saveGymEquipment(nextEquipment);
    setSelectedId(nextSelected.id);
    setDraft(nextSelected);
    setMessage("Elemento eliminado.");
  }

  function exitWithoutSaving() {
    setDraft(selectedItem);
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
          <p className="text-xs font-black uppercase tracking-wider text-[#7C6CF2]">Ajustes &gt; Mi gimnasio</p>
          <h3 className="mt-1 text-base font-black text-[#1F2937]">Elementos disponibles</h3>
          <p className="mt-1 text-sm leading-6 text-[#6B7280]">Carga lo que tenes en casa para armar ejercicios y rutinas mas rapido.</p>
        </div>
        <button type="button" className="secondary-button shrink-0 !py-2" onClick={createItem}>
          Nuevo
        </button>
      </div>

      <input className="field-input mt-4" placeholder="Buscar elemento, tipo o notas" value={query} onChange={(event) => setQuery(event.target.value)} />

      {equipment.length === 0 ? (
        <EmptyState
          title="Todavia no cargaste elementos."
          text="Agrega lo que tenes disponible en tu gym para armar ejercicios mas rapido."
          action="Agregar elemento"
          onAction={createItem}
        />
      ) : (
        <div className="mt-3 grid gap-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">{filteredEquipment.length} elementos</p>
            <div className="flex gap-2">
              <button type="button" className="text-xs font-black text-[#7C6CF2]" onClick={expandAllGroups}>
                Expandir todo
              </button>
              <button type="button" className="text-xs font-black text-[#6B7280]" onClick={collapseAllGroups}>
                Contraer
              </button>
            </div>
          </div>

          {groupedEquipment.map((group) => {
            const isExpanded = expandedGroups.includes(group.name) || query.trim().length > 0;
            const activeCount = group.items.filter((item) => item.isActive).length;

            return (
              <div key={group.name} className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F5F6FA]">
                <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-[#FFF7F3]" onClick={() => toggleGroup(group.name)}>
                  <span>
                    <span className="block text-sm font-black text-[#1F2937]">{group.name}</span>
                    <span className="mt-0.5 block text-xs font-bold text-[#6B7280]">{group.items.length} elementos · {activeCount} activos</span>
                  </span>
                  <span className="text-lg font-black text-[#7C6CF2]">{isExpanded ? "-" : "+"}</span>
                </button>

                {isExpanded ? (
                  <div className="grid gap-1 border-t border-[#E5E7EB] bg-white p-2">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          item.id === draft.id ? "border-[#7C6CF2] bg-[#F7F3FF]" : "border-[#E5E7EB] bg-white hover:border-[#FFD5C2] hover:bg-[#FFF7F3]"
                        }`}
                        onClick={() => selectItem(item)}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-black text-[#1F2937]">{item.name || "Elemento sin nombre"}</span>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-black ${item.isActive ? "bg-[#E9E5FF] text-[#7C6CF2]" : "bg-[#F5F6FA] text-[#6B7280]"}`}>
                            {item.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs font-bold text-[#6B7280]">
                          {item.type}
                          {item.weightRange ? ` · ${item.weightRange}${item.unit ? ` ${item.unit}` : ""}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          {false && filteredEquipment.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-2xl border p-3 text-left transition ${
                item.id === draft.id ? "border-[#7C6CF2] bg-[#F7F3FF]" : "border-[#E5E7EB] bg-[#F5F6FA] hover:border-[#FFD5C2] hover:bg-[#FFF7F3]"
              }`}
              onClick={() => selectItem(item)}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-black text-[#1F2937]">{item.name || "Elemento sin nombre"}</span>
                <span className={`rounded-full px-2 py-1 text-[11px] font-black ${item.isActive ? "bg-[#E9E5FF] text-[#7C6CF2]" : "bg-[#F5F6FA] text-[#6B7280]"}`}>
                  {item.isActive ? "Activo" : "Inactivo"}
                </span>
              </span>
              <span className="mt-1 block text-xs font-bold text-[#6B7280]">
                {item.type}
                {item.weightRange ? ` · ${item.weightRange}${item.unit ? ` ${item.unit}` : ""}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-[#FBFAFF] p-3">
        <p className="text-sm font-black text-[#1F2937]">Editar elemento</p>
        <div className="mt-3 grid gap-3">
          <label className="field-label">
            Nombre
            <input className="field-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label className="field-label">
            Tipo de elemento
            <select className="field-input" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
              {equipmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="field-label">
              Peso disponible
              <input className="field-input" placeholder="2 a 20" value={draft.weightRange ?? ""} onChange={(event) => setDraft({ ...draft, weightRange: event.target.value })} />
            </label>
            <label className="field-label">
              Unidad
              <input className="field-input" value={draft.unit ?? "kg"} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} />
            </label>
          </div>
          <label className="field-label">
            Notas
            <input className="field-input" value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-sm font-bold text-[#1F2937]">
            Activo
            <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />
          </label>
        </div>
      </div>

      {message ? <p className="mt-3 rounded-xl bg-[#E9E5FF] px-3 py-2 text-sm font-bold text-[#7C6CF2]">{message}</p> : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className="secondary-button" onClick={deleteDraft}>
          Eliminar
        </button>
        <button type="button" className="rounded-xl bg-[#FF8A5B] px-3 py-3 text-sm font-bold text-white shadow-sm" onClick={saveDraft}>
          Guardar cambios
        </button>
      </div>

      {showUnsavedConfirm ? (
        <UnsavedChangesModal
          onSave={saveDraft}
          onDiscard={exitWithoutSaving}
          onContinue={() => setShowUnsavedConfirm(false)}
        />
      ) : null}
    </section>
  );
}

function createEmptyEquipment(): GymEquipmentItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    type: "Otros",
    unit: "kg",
    isActive: true,
  };
}

function groupEquipmentByCategory(equipment: GymEquipmentItem[]) {
  const categories = [
    "Peso corporal",
    "Mancuernas",
    "Kettlebells",
    "Barras y discos",
    "Bancos",
    "Bandas elasticas",
    "Maquinas",
    "Accesorios / movilidad",
    "Otros",
  ];
  const groups = new Map<string, GymEquipmentItem[]>();

  for (const category of categories) {
    groups.set(category, []);
  }

  for (const item of equipment) {
    const category = getEquipmentCategory(item);
    groups.set(category, [...(groups.get(category) ?? []), item]);
  }

  return Array.from(groups.entries())
    .map(([name, items]) => ({
      name,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((group) => group.items.length > 0);
}

function getEquipmentCategory(item: GymEquipmentItem) {
  const value = `${item.type} ${item.name}`.toLowerCase();

  if (value.includes("peso corporal")) return "Peso corporal";
  if (value.includes("mancuerna")) return "Mancuernas";
  if (value.includes("kettlebell")) return "Kettlebells";
  if (value.includes("barra") || value.includes("disco")) return "Barras y discos";
  if (value.includes("banco")) return "Bancos";
  if (value.includes("banda")) return "Bandas elasticas";
  if (value.includes("maquina") || value.includes("polea")) return "Maquinas";
  if (value.includes("colchoneta") || value.includes("cardio") || value.includes("accesorio") || value.includes("core") || value.includes("soga") || value.includes("rueda") || value.includes("tobillera")) {
    return "Accesorios / movilidad";
  }

  return "Otros";
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

export { equipmentTypes };
