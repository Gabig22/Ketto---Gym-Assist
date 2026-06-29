import { app, BrowserWindow, Menu, nativeImage, Tray, ipcMain, screen, shell } from "electron";
import path from "node:path";

type AssistantMode = "collapsed" | "expanded" | "maximized";

const COLLAPSED_SIZE = { width: 96, height: 96 };
const EXPANDED_SIZE = { width: 430, height: 660 };
const MAXIMIZED_MARGIN = 0;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let currentMode: AssistantMode = "collapsed";

const isDev = process.env.NODE_ENV !== "production" && !app.isPackaged;

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="body" x1="12" y1="18" x2="52" y2="58">
          <stop stop-color="#52525b"/>
          <stop offset="0.45" stop-color="#18181b"/>
          <stop offset="1" stop-color="#030712"/>
        </linearGradient>
      </defs>
      <path d="M23 25a9 9 0 0 1 18 0h-6a3 3 0 0 0-6 0z" fill="#fb923c"/>
      <path d="M15 29c0-5 4-8 9-8h16c5 0 9 3 9 8v16c0 9-7 15-17 15S15 54 15 45z" fill="url(#body)"/>
      <circle cx="25" cy="39" r="3" fill="#f8fafc"/>
      <circle cx="39" cy="39" r="3" fill="#f8fafc"/>
      <path d="M26 49c4 3 8 3 12 0" fill="none" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;

  return nativeImage.createFromDataURL(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  );
}

function getPreloadPath() {
  return path.join(__dirname, "preload.js");
}

function getRendererUrl() {
  return isDev
    ? "http://127.0.0.1:5173"
    : `file://${path.join(__dirname, "../dist/index.html")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function applyWindowBehavior(mode: AssistantMode) {
  if (!mainWindow) {
    return;
  }

  if (mode === "maximized") {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setSkipTaskbar(false);
    mainWindow.setBackgroundColor("#F5F6FA");
    return;
  }

  mainWindow.setBackgroundColor("#00000000");
  mainWindow.setAlwaysOnTop(true, "floating");
  mainWindow.setSkipTaskbar(true);
}

function setAssistantMode(mode: AssistantMode) {
  if (!mainWindow) {
    return;
  }

  applyWindowBehavior(mode);
  const bounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(bounds).workArea;

  if (mode === "maximized") {
    mainWindow.setBounds({
      x: display.x + MAXIMIZED_MARGIN,
      y: display.y + MAXIMIZED_MARGIN,
      width: display.width - MAXIMIZED_MARGIN * 2,
      height: display.height - MAXIMIZED_MARGIN * 2,
    });
    currentMode = mode;
    return;
  }

  const size = mode === "expanded" ? EXPANDED_SIZE : COLLAPSED_SIZE;
  const anchorRight = bounds.x + bounds.width;
  const anchorBottom = bounds.y + bounds.height;

  mainWindow.setBounds({
    x: clamp(anchorRight - size.width, display.x, display.x + display.width - size.width),
    y: clamp(anchorBottom - size.height, display.y, display.y + display.height - size.height),
    width: size.width,
    height: size.height,
  });
  currentMode = mode;
}

function moveAssistantBy(deltaX: number, deltaY: number) {
  if (!mainWindow) {
    return;
  }

  const bounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(bounds).workArea;

  mainWindow.setBounds({
    ...bounds,
    x: clamp(bounds.x + deltaX, display.x, display.x + display.width - bounds.width),
    y: clamp(bounds.y + deltaY, display.y, display.y + display.height - bounds.height),
  });
}

function showAssistant(mode: AssistantMode = "collapsed") {
  if (!mainWindow) {
    return;
  }

  setAssistantMode(mode);
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("assistant:mode", mode);
}

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workArea;

  mainWindow = new BrowserWindow({
    width: COLLAPSED_SIZE.width,
    height: COLLAPSED_SIZE.height,
    x: workArea.x + workArea.width - COLLAPSED_SIZE.width - 32,
    y: workArea.y + workArea.height - COLLAPSED_SIZE.height - 48,
    frame: false,
    resizable: false,
    movable: true,
    show: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, "floating");
  mainWindow.loadURL(getRendererUrl());
  mainWindow.once("ready-to-show", () => showAssistant("collapsed"));
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow?.webContents.send("assistant:mode", currentMode);
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip("Ketto Gym Assistant");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Mostrar",
        click: () => showAssistant("expanded"),
      },
      {
        label: "Ocultar",
        click: () => mainWindow?.hide(),
      },
      { type: "separator" },
      {
        label: "Salir",
        click: () => app.quit(),
      },
    ]),
  );
  tray.on("click", () => showAssistant("collapsed"));
}

app.whenReady().then(() => {
  ipcMain.handle("assistant:set-mode", (_event, mode: AssistantMode) => {
    setAssistantMode(mode);
    return mode;
  });
  ipcMain.handle("assistant:move-by", (_event, deltaX: number, deltaY: number) => {
    moveAssistantBy(deltaX, deltaY);
  });
  ipcMain.handle("assistant:hide", () => mainWindow?.hide());
  ipcMain.handle("assistant:quit", () => app.quit());
  ipcMain.handle("assistant:reload-ui", () => {
    setAssistantMode("collapsed");
    mainWindow?.webContents.reloadIgnoringCache();
  });
  ipcMain.handle("assistant:open-external", (_event, url: string) => {
    const parsedUrl = new URL(url);

    if (!["https:", "http:"].includes(parsedUrl.protocol)) {
      throw new Error("Unsupported external URL protocol");
    }

    return shell.openExternal(parsedUrl.toString());
  });

  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showAssistant("collapsed");
    }
  });
});

app.on("window-all-closed", () => {
  // Keep the tray alive when the assistant window is hidden or closed.
});
