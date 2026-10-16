import { app, BrowserWindow, shell } from "electron";
import * as fs from "fs";
import * as path from "path";
import { createServer } from "./server";

const PORT = 3001;
let mainWindow: BrowserWindow | null = null;

function resolveOutDir(): string {
  const candidates = [
    path.join(app.getAppPath(), "out"),
    path.join(process.cwd(), "out"),
    path.join(app.getAppPath(), "..", "out"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) return candidate;
  }
  return candidates[0];
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: "#0f1115",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env.DAI_DEV;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadURL(`http://localhost:${PORT}`);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const outDir = resolveOutDir();
  const server = createServer(outDir);
  const httpServer = server.listen(PORT, "127.0.0.1", () => {
    console.log(`Dai Dubber backend listening on http://localhost:${PORT}`);
    createWindow();
  });
  httpServer.on("error", (error: Error) => {
    console.error("Backend server error:", error);
    createWindow();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
