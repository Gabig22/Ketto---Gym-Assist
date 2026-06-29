/// <reference types="vite/client" />

type AssistantMode = "collapsed" | "expanded" | "maximized";

interface KettoAssistantApi {
  setMode: (mode: AssistantMode) => Promise<AssistantMode>;
  moveBy: (deltaX: number, deltaY: number) => Promise<void>;
  hide: () => Promise<void>;
  quit: () => Promise<void>;
  reloadUi: () => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  onModeChange: (callback: (mode: AssistantMode) => void) => () => void;
}

interface Window {
  kettoAssistant: KettoAssistantApi;
}
