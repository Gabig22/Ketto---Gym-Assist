import { useMemo } from "react";
import { getProgressSummary } from "../services/workoutService";

interface ProgressPanelProps {
  refreshKey: number;
}

export default function ProgressPanel({ refreshKey }: ProgressPanelProps) {
  const summary = useMemo(() => getProgressSummary(), [refreshKey]);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <h2 className="text-lg font-black text-[#1F2937]">Progreso</h2>

      <div className="mt-4 grid gap-3">
        <ProgressMetric
          label="Ultimo entrenamiento"
          value={summary.lastWorkout ? formatDate(summary.lastWorkout.completedAt ?? summary.lastWorkout.startedAt) : "Sin datos"}
        />
        <ProgressMetric label="Total de series" value={String(summary.totalSets)} />
        <ProgressMetric
          label="Mayor mejora"
          value={
            summary.biggestImprovement
              ? `${summary.biggestImprovement.exerciseName}: ${summary.biggestImprovement.previousBestKg} -> ${summary.biggestImprovement.currentBestKg} kg`
              : "Aun sin mejora medible"
          }
        />
      </div>

      <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-[#1F2937]">Volumen aproximado por sesion</p>
        <div className="mt-3 space-y-3">
          {summary.volumeBySession.length > 0 ? (
            summary.volumeBySession.map((session) => (
              <div key={session.sessionId} className="text-sm">
                <div className="flex justify-between gap-3 font-medium text-[#1F2937]">
                  <span className="truncate">{session.templateName}</span>
                  <span>{session.volumeKg} kg</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#E9E5FF]">
                  <div className="h-full rounded-full bg-[#FF8A5B]" style={{ width: `${Math.min(100, session.volumeKg / 25)}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#6B7280]">Guarda un entrenamiento y Ketto calcula el volumen.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-[#7C6CF2]">{label}</p>
      <p className="mt-2 text-sm font-bold text-[#1F2937]">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
