import type { GymEquipmentItem } from "../types";

const GYM_EQUIPMENT_KEY = "ketto.gymEquipment.v1";

export const defaultGymEquipment: GymEquipmentItem[] = [
  { id: "bodyweight", name: "Peso corporal", type: "Peso corporal", notes: "Siempre disponible", isActive: true },
  { id: "dumbbells", name: "Mancuernas", type: "Mancuernas", weightRange: "2 a 20", unit: "kg", isActive: true },
  { id: "adjustable-dumbbells", name: "Mancuernas regulables", type: "Mancuernas", weightRange: "2 a 20", unit: "kg", isActive: true },
  { id: "kettlebell", name: "Kettlebell", type: "Kettlebell", weightRange: "12", unit: "kg", isActive: true },
  { id: "barbell", name: "Barra", type: "Barra", unit: "kg", isActive: true },
  { id: "plates", name: "Discos", type: "Discos", unit: "kg", isActive: true },
  { id: "flat-bench", name: "Banco plano", type: "Banco", isActive: true },
  { id: "incline-bench", name: "Banco inclinado", type: "Banco", isActive: true },
  { id: "mat", name: "Colchoneta", type: "Movilidad / Core", isActive: true },
  { id: "resistance-band", name: "Banda elastica", type: "Banda", isActive: true },
  { id: "pulley", name: "Polea", type: "Polea", isActive: true },
  { id: "machine", name: "Maquina", type: "Maquina", isActive: true },
  { id: "jump-rope", name: "Soga", type: "Cardio", isActive: true },
  { id: "ab-wheel", name: "Rueda abdominal", type: "Core", isActive: true },
  { id: "ankle-weights", name: "Tobilleras", type: "Accesorio", unit: "kg", isActive: true },
];

export function loadGymEquipment(): GymEquipmentItem[] {
  try {
    const rawEquipment = localStorage.getItem(GYM_EQUIPMENT_KEY);

    if (!rawEquipment) {
      return defaultGymEquipment;
    }

    const parsed = JSON.parse(rawEquipment);
    return Array.isArray(parsed) ? parsed.map(normalizeEquipmentItem) : defaultGymEquipment;
  } catch {
    return defaultGymEquipment;
  }
}

export function saveGymEquipment(equipment: GymEquipmentItem[]) {
  localStorage.setItem(GYM_EQUIPMENT_KEY, JSON.stringify(equipment.map(normalizeEquipmentItem)));
}

export function createGymEquipmentFromName(name: string): GymEquipmentItem {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    type: "Otros",
    isActive: true,
  };
}

function normalizeEquipmentItem(item: GymEquipmentItem): GymEquipmentItem {
  return {
    ...item,
    unit: item.unit ?? "kg",
    isActive: item.isActive ?? true,
  };
}
