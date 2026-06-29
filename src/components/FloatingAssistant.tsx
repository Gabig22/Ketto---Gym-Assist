import { useRef } from "react";
import AssistantPanel from "./AssistantPanel";

type AssistantMode = "collapsed" | "expanded" | "maximized";

interface FloatingAssistantProps {
  mode: AssistantMode;
  onExpand: () => void;
  onCollapse: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  onHide: () => void;
  onOpenExternal: (url: string) => void;
}

export default function FloatingAssistant({
  mode,
  onExpand,
  onCollapse,
  onMaximize,
  onRestore,
  onHide,
}: FloatingAssistantProps) {
  const dragState = useRef({
    isPointerDown: false,
    moved: false,
    lastX: 0,
    lastY: 0,
  });

  if (mode === "expanded" || mode === "maximized") {
    return (
      <AssistantPanel
        isMaximized={mode === "maximized"}
        onCollapse={onCollapse}
        onMaximize={onMaximize}
        onRestore={onRestore}
        onHide={onHide}
      />
    );
  }

  return (
    <main className="flex h-screen w-screen items-center justify-center overflow-hidden bg-transparent">
      <section className="group relative grid h-24 w-24 place-items-center rounded-full" aria-label="Ketto Gym Assistant">
        <button
          type="button"
          className="no-drag relative grid h-[86px] w-[86px] cursor-grab touch-none place-items-center rounded-full outline-none transition duration-300 hover:scale-105 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-orange-300"
          onPointerDown={(event) => {
            dragState.current = {
              isPointerDown: true,
              moved: false,
              lastX: event.screenX,
              lastY: event.screenY,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragState.current.isPointerDown) {
              return;
            }

            const deltaX = event.screenX - dragState.current.lastX;
            const deltaY = event.screenY - dragState.current.lastY;

            if (Math.abs(deltaX) + Math.abs(deltaY) > 2) {
              dragState.current.moved = true;
              window.kettoAssistant.moveBy(deltaX, deltaY);
              dragState.current.lastX = event.screenX;
              dragState.current.lastY = event.screenY;
            }
          }}
          onPointerUp={(event) => {
            dragState.current.isPointerDown = false;
            event.currentTarget.releasePointerCapture(event.pointerId);

            if (!dragState.current.moved) {
              onExpand();
            }
          }}
          aria-label="Abrir Ketto"
        >
          <span className="mini-ketto" aria-hidden="true">
            <span className="mini-ketto-handle" />
            <span className="mini-ketto-body">
              <span className="mini-ketto-eye mini-ketto-eye-left" />
              <span className="mini-ketto-eye mini-ketto-eye-right" />
              <span className="mini-ketto-smile" />
              <span className="mini-ketto-badge">K</span>
            </span>
          </span>
        </button>
      </section>
    </main>
  );
}
