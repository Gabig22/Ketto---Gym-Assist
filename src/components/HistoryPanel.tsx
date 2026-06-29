import { useMemo } from "react";
import { getSessionVolume } from "../services/workoutService";
import { loadWorkoutHistory } from "../storage/workoutHistory";

interface HistoryPanelProps {
  refreshKey: number;
  onBack: () => void;
}

export default function HistoryPanel({ refreshKey, onBack: _onBack }: HistoryPanelProps) {
  const history = useMemo(() => loadWorkoutHistory(), [refreshKey]);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <h2 className="text-lg font-black text-[#1F2937]">Historial</h2>

      <div className="mt-4 space-y-3">
        {history.length > 0 ? (
          history.map((session) => {
            const isIncomplete = session.status === "incomplete";
            const volume = getSessionVolume(session);
            const blockCount = new Set(session.sets.map((set) => set.blockId).filter(Boolean)).size;
            const roundCount = new Set(
              session.sets.map((set) => `${set.blockId ?? "legacy"}-${set.roundNumber ?? 1}`),
            ).size;
            const exerciseCount = new Set(session.sets.map((set) => set.exerciseId)).size;

            return (
            <article key={session.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#1F2937]">{session.templateName}</h3>
                  <p className="mt-1 text-xs font-medium text-[#6B7280]">{formatDate(session.completedAt ?? session.startedAt)}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    isIncomplete ? "bg-[#FFF7F3] text-[#FF8A5B]" : "bg-[#E9E5FF] text-[#7C6CF2]"
                  }`}
                >
                  {isIncomplete ? "Incompleta" : "Completa"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#6B7280]">
                <span className="rounded-xl bg-[#F5F6FA] px-3 py-2">{session.sets.length} series</span>
                <span className="rounded-xl bg-[#F5F6FA] px-3 py-2">{volume} kg volumen</span>
                <span className="rounded-xl bg-[#F5F6FA] px-3 py-2">{blockCount || 1} bloques</span>
                <span className="rounded-xl bg-[#F5F6FA] px-3 py-2">{exerciseCount} ejercicios</span>
                <span className="rounded-xl bg-[#F5F6FA] px-3 py-2">{roundCount} rondas</span>
                <span className="rounded-xl bg-[#F5F6FA] px-3 py-2">{formatDuration(session.durationSeconds)} duración</span>
              </div>

              <div className="mt-3 space-y-3">
                {groupSets(session.sets).map((group) => (
                  <div key={group.exerciseName} className="rounded-xl bg-[#F5F6FA] p-3">
                    <p className="text-sm font-bold text-[#1F2937]">{group.exerciseName}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.sets.map((set, index) => (
                        <span key={set.id} className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-[#6B7280]">
                          {index + 1}: {formatSetValue(set)}
                          {set.note ? ` · ${set.note}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
          })
        ) : (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#6B7280] shadow-sm">
            Todavia no hay entrenamientos guardados.
          </div>
        )}
      </div>
    </div>
  );
}

function groupSets(sets: Array<{ id: string; exerciseName: string; weightKg: number; reps: number; timeSeconds?: number; note?: string }>) {
  return Array.from(
    sets.reduce((groups, set) => {
      const group = groups.get(set.exerciseName) ?? { exerciseName: set.exerciseName, sets: [] as typeof sets };
      group.sets.push(set);
      groups.set(set.exerciseName, group);
      return groups;
    }, new Map<string, { exerciseName: string; sets: typeof sets }>()),
  ).map(([, group]) => group);
}

function formatSetValue(set: { weightKg: number; reps: number; timeSeconds?: number }) {
  const weightLabel = set.weightKg > 0 ? `${set.weightKg} kg x ` : "";
  return set.timeSeconds ? `${weightLabel}${set.timeSeconds}s` : `${set.weightKg} kg x ${set.reps}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(seconds?: number) {
  if (!seconds) {
    return "-";
  }

  return `${Math.max(1, Math.round(seconds / 60))} min`;
}
