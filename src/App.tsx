import { useEffect, useState } from "react";
import FloatingAssistant from "./components/FloatingAssistant";

type AssistantMode = "collapsed" | "expanded" | "maximized";

export default function App() {
  const [mode, setMode] = useState<AssistantMode>("collapsed");
  const assistantApi =
    window.kettoAssistant ??
    ({
      setMode: async (nextMode: AssistantMode) => nextMode,
      moveBy: async () => undefined,
      hide: async () => undefined,
      quit: async () => undefined,
      reloadUi: async () => window.location.reload(),
      openExternal: async (url: string) => {
        window.open(url, "_blank", "noopener,noreferrer");
      },
      onModeChange: () => () => undefined,
    } satisfies KettoAssistantApi);

  useEffect(() => {
    return assistantApi.onModeChange((nextMode) => setMode(nextMode));
  }, [assistantApi]);

  async function changeMode(nextMode: AssistantMode) {
    await assistantApi.setMode(nextMode);
    setMode(nextMode);
  }

  return (
    <FloatingAssistant
      mode={mode}
      onExpand={() => changeMode("expanded")}
      onCollapse={() => changeMode("collapsed")}
      onMaximize={() => changeMode("maximized")}
      onRestore={() => changeMode("expanded")}
      onHide={() => assistantApi.hide()}
      onOpenExternal={(url) => assistantApi.openExternal(url)}
    />
  );
}
