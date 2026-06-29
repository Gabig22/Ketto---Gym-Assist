import { useCallback, useState } from "react";
import type { AssistantView } from "../types";
import { getSuggestedWorkoutTemplate, getWorkoutTemplates } from "../services/workoutService";
import WorkoutChatPanel from "./WorkoutChatPanel";
import ProgressPanel from "./ProgressPanel";
import HistoryPanel from "./HistoryPanel";
import ExerciseLibraryPanel from "./ExerciseLibraryPanel";

interface AssistantPanelProps {
  isMaximized: boolean;
  onCollapse: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  onHide: () => void;
}

const primaryActions: Array<{ view: AssistantView; label: string; caption: string }> = [
  { view: "routine", label: "Iniciar rutina", caption: "Dia A, B o C" },
  { view: "free", label: "Entreno libre", caption: "Cargar sin plan" },
  { view: "progress", label: "Ver progreso", caption: "Resumen simple" },
  { view: "history", label: "Historial", caption: "Sesiones guardadas" },
];

export default function AssistantPanel({
  isMaximized,
  onCollapse,
  onMaximize,
  onRestore,
  onHide,
}: AssistantPanelProps) {
  const [activeView, setActiveView] = useState<AssistantView>("home");
  const [viewStack, setViewStack] = useState<AssistantView[]>([]);
  const [workoutBackRequestId, setWorkoutBackRequestId] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  function refreshStats() {
    setRefreshKey((key) => key + 1);
  }

  const navigateTo = useCallback((view: AssistantView) => {
    setActiveView((currentView) => {
      if (currentView === view) {
        return currentView;
      }

      setViewStack((currentStack) => {
        const previousView = currentStack[currentStack.length - 1];
        return previousView === currentView ? currentStack : [...currentStack, currentView];
      });

      return view;
    });
  }, []);

  const goBack = useCallback(() => {
    setViewStack((currentStack) => {
      const previousView = currentStack[currentStack.length - 1] ?? "home";
      setActiveView(previousView);
      return currentStack.slice(0, -1);
    });
  }, []);

  function handleHeaderBack() {
    if (activeView === "routine" || activeView === "free") {
      setWorkoutBackRequestId((id) => id + 1);
      return;
    }

    goBack();
  }

  return (
    <main className={`flex h-screen w-screen overflow-hidden ${isMaximized ? "bg-[#F5F6FA] p-3" : "bg-transparent p-3"}`}>
      <section
        className={`relative flex h-full w-full flex-col overflow-hidden border border-[#E5E7EB] bg-[#F5F6FA] text-[#1F2937] shadow-[0_24px_70px_rgba(31,41,55,0.16)] ${
          isMaximized ? "rounded-2xl" : "rounded-[26px]"
        }`}
      >
        <header className="drag-region flex h-[76px] shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white/95 px-5">
          <button
            type="button"
            className="no-drag flex min-w-0 items-center gap-3 text-left"
            onClick={() => navigateTo("home")}
            aria-label="Volver al inicio"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#FFD5C2] text-[#1F2937] shadow-sm">
              <span className="text-lg font-black text-[#FF8A5B]">K</span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-black leading-5 tracking-normal text-[#1F2937]">Ketto</span>
              <span className="mt-0.5 block truncate text-xs font-semibold leading-4 text-[#6B7280]">Asistente de rutinas</span>
            </span>
          </button>

          <div className="no-drag flex items-center gap-2">
            <button className="icon-button" type="button" onClick={handleHeaderBack} aria-label="Volver atras" title="Volver atras">
              &larr;
            </button>
            <button className="icon-button settings" type="button" onClick={() => navigateTo("settings")} aria-label="Abrir ajustes" title="Ajustes">
              ⚙
            </button>
            <button className="icon-button" type="button" onClick={onCollapse} aria-label="Minimizar" title="Minimizar">
              —
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={isMaximized ? onRestore : onMaximize}
              aria-label={isMaximized ? "Restaurar tamano" : "Maximizar"}
              title={isMaximized ? "Restaurar tamano" : "Maximizar"}
            >
              {isMaximized ? <span className="restore-icon" aria-hidden="true" /> : <span className="maximize-icon" aria-hidden="true" />}
            </button>
            <button className="icon-button danger" type="button" onClick={onHide} aria-label="Cerrar" title="Cerrar">
              ×
            </button>
          </div>
        </header>

        <div className={`grid min-h-0 flex-1 ${isMaximized ? "grid-cols-[236px_minmax(0,1fr)]" : "grid-cols-1"}`}>
          <aside className={`${isMaximized ? "block" : "hidden"} border-r border-[#E5E7EB] bg-white/70 p-4`}>
            <nav className="flex flex-col gap-2">
              {primaryActions.map((item) => (
                <button
                  key={item.view}
                  type="button"
                  className={`rounded-lg px-3 py-3 text-left transition ${
                    activeView === item.view ? "bg-[#FF8A5B] text-white shadow-sm" : "text-[#1F2937] hover:bg-[#E9E5FF]"
                  }`}
                  onClick={() => navigateTo(item.view)}
                >
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className={`mt-0.5 block text-xs ${activeView === item.view ? "text-white/80" : "text-[#6B7280]"}`}>
                    {item.caption}
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          <section className="min-h-0 overflow-hidden bg-[#F5F6FA]">
            {activeView === "home" ? (
              <HomePanel onSelect={navigateTo} />
            ) : activeView === "progress" ? (
              <ProgressPanel refreshKey={refreshKey} onBack={goBack} />
            ) : activeView === "history" ? (
              <HistoryPanel refreshKey={refreshKey} onBack={goBack} />
            ) : activeView === "settings" ? (
              <SettingsPanel onBack={goBack} />
            ) : (
              <WorkoutChatPanel
                mode={activeView === "free" ? "free" : "routine"}
                onSaved={refreshStats}
                onGoHome={() => navigateTo("home")}
                onViewHistory={() => navigateTo("history")}
                onBack={goBack}
                backRequestId={workoutBackRequestId}
              />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function HomePanel({ onSelect }: { onSelect: (view: AssistantView) => void }) {
  const suggestedTemplate = getSuggestedWorkoutTemplate(getWorkoutTemplates());

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="inline-flex rounded-full bg-[#E9E5FF] px-3 py-1 text-xs font-bold text-[#7C6CF2]">✓ Listo para entrenar</div>
        <p className="mt-4 text-xl font-black leading-7 text-[#1F2937]">
          Buenas Gabi, soy Ketto.
          <br />
          ¿Entrenamos hoy?
        </p>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
          Elegi una opcion y registramos tus series rapido, claro y sin vueltas.
        </p>
        <button
          type="button"
          className="mt-5 w-full rounded-2xl bg-[#FF8A5B] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f97845] hover:shadow-md active:translate-y-0 active:shadow-sm"
          onClick={() => onSelect("routine")}
        >
          Iniciar rutina
        </button>
      </div>

      {suggestedTemplate ? (
        <div className="mt-4 rounded-[22px] border-2 border-[#CBBFFF] bg-gradient-to-br from-[#F7F3FF] via-white to-[#F7F3FF] p-4 shadow-[0_14px_34px_rgba(124,108,242,0.12)]">
          <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wider text-[#7C6CF2] shadow-sm">
            Recomendada
          </div>
          <h3 className="mt-2 text-lg font-black text-[#1F2937]">{suggestedTemplate.name}</h3>
          <p className="mt-1 text-sm text-[#6B7280]">{suggestedTemplate.description ?? suggestedTemplate.focus}</p>
          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-[#7C6CF2] px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#6757E8]"
            onClick={() => onSelect("routine")}
          >
            Arrancar ahora
          </button>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {primaryActions.map((item) => (
          <button
            key={item.view}
            type="button"
            className="group cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#FFD5C2] hover:bg-[#FFFDFC] hover:shadow-md active:translate-y-0 active:shadow-sm"
            onClick={() => onSelect(item.view)}
          >
            <span className="block text-sm font-bold text-[#1F2937]">{item.label}</span>
            <span className="mt-1 block text-xs text-[#6B7280]">{item.caption}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({ onBack: _onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <h2 className="text-lg font-black text-[#1F2937]">Ajustes</h2>
      <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm leading-6 text-[#6B7280] shadow-sm">
        <p className="font-bold text-[#1F2937]">Version MVP local.</p>
        <p className="mt-2">Sin backend, login, IA ni integraciones externas. Los entrenamientos se guardan en este equipo con localStorage.</p>
      </div>
      <ExerciseLibraryPanel />
    </div>
  );
}
