import type { WorkoutTemplate } from "../types";
import { getLastSessionForTemplate, getSessionVolume, getTemplateStats } from "../services/workoutService";

interface WorkoutCardProps {
  template: WorkoutTemplate;
  onStart: (template: WorkoutTemplate) => void;
  onEdit?: (template: WorkoutTemplate) => void;
  onDelete?: (template: WorkoutTemplate) => void;
}

export default function WorkoutCard({ template, onStart, onEdit, onDelete }: WorkoutCardProps) {
  const stats = getTemplateStats(template);
  const lastSession = getLastSessionForTemplate(template.id);
  const hasRounds = template.blocks?.some((block) => block.type !== "single");

  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-[#1F2937]">{template.name}</h3>
          <p className="mt-1 text-sm font-medium text-[#FF8A5B]">{template.description ?? template.focus}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#E9E5FF] px-3 py-1 text-xs font-bold text-[#7C6CF2]">
          {stats.blockCount} bloques
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#6B7280]">
        <span className="rounded-xl bg-[#F5F6FA] px-3 py-2">{stats.exerciseCount} ejercicios</span>
        <span className="rounded-xl bg-[#F5F6FA] px-3 py-2">
          {hasRounds ? `${stats.totalRounds} rondas` : `${stats.estimatedSets} series`}
        </span>
        <span className="rounded-xl bg-[#F5F6FA] px-3 py-2">
          {lastSession ? `Ultima: ${formatDate(lastSession.completedAt ?? lastSession.startedAt)}` : "Sin historial"}
        </span>
        <span className="rounded-xl bg-[#F5F6FA] px-3 py-2">
          {lastSession ? `${getSessionVolume(lastSession)} kg` : "Volumen -"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="rounded-xl bg-[#FF8A5B] px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#f97845]"
          onClick={() => onStart(template)}
        >
          Iniciar
        </button>
        <button type="button" className="secondary-button !py-2.5" onClick={() => onEdit?.(template)}>
          Editar
        </button>
        <button type="button" className="col-span-2 text-sm font-bold text-[#6B7280] transition hover:text-[#E11D48]" onClick={() => onDelete?.(template)}>
          Eliminar rutina
        </button>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}
