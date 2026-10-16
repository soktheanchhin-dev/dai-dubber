import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

const isWindows = process.platform === "win32";

/**
 * Locates the bundled `tools` directory (ffmpeg / ffprobe / embedded python).
 * Resolution order:
 *  1. DAI_TOOLS_DIR environment override
 *  2. packaged extraResources (`resources/tools`)
 *  3. `<app>/tools`
 *  4. `<app>/../tools` (workspace layout — project sits next to the tools folder)
 *  5. `<cwd>/tools`
 */
export function getToolsDir(): string | null {
  const exe = isWindows ? "ffmpeg.exe" : "ffmpeg";
  const candidates: Array<string | undefined> = [
    process.env.DAI_TOOLS_DIR,
    process.resourcesPath ? path.join(process.resourcesPath, "tools") : undefined,
    path.join(app.getAppPath(), "tools"),
    path.join(app.getAppPath(), "..", "tools"),
    path.join(process.cwd(), "tools"),
    path.join(process.cwd(), "..", "tools"),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(path.join(candidate, exe))) return candidate;
  }
  return null;
}

export function getFfmpegPath(): string {
  const dir = getToolsDir();
  return dir ? path.join(dir, isWindows ? "ffmpeg.exe" : "ffmpeg") : "ffmpeg";
}

export function getFfprobePath(): string {
  const dir = getToolsDir();
  return dir ? path.join(dir, isWindows ? "ffprobe.exe" : "ffprobe") : "ffprobe";
}

export function getPythonPath(): string {
  const dir = getToolsDir();
  if (dir) {
    const candidate = path.join(dir, "python", isWindows ? "python.exe" : "python");
    if (fs.existsSync(candidate)) return candidate;
  }
  return isWindows ? "python" : "python3";
}
