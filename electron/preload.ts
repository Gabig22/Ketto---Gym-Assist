import { contextBridge, ipcRenderer } from "electron";

type AssistantMode = "collapsed" | "expanded" | "maximized";

const api = {
  setMode: (mode: AssistantMode) => ipcRenderer.invoke("assistant:set-mode", mode),
  moveBy: (deltaX: number, deltaY: number) => ipcRenderer.invoke("assistant:move-by", deltaX, deltaY),
  hide: () => ipcRenderer.invoke("assistant:hide"),
  quit: () => ipcRenderer.invoke("assistant:quit"),
  reloadUi: () => ipcRenderer.invoke("assistant:reload-ui"),
  openExternal: (url: string) => ipcRenderer.invoke("assistant:open-external", url),
  onModeChange: (callback: (mode: AssistantMode) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, mode: AssistantMode) => callback(mode);
    ipcRenderer.on("assistant:mode", listener);

    return () => ipcRenderer.removeListener("assistant:mode", listener);
  },
};

contextBridge.exposeInMainWorld("kettoAssistant", api);
