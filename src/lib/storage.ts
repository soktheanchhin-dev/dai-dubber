import type { AppSettings, ThemeColors } from "./types";

export const DEFAULT_TEMP_PATH = "C:\\Temp\\AIDubber";
export const DEFAULT_EXPORT_PATH = "C:\\Export\\AIDubber";
export const DEFAULT_MODEL = "gemini-2.0-flash";

export const DEFAULT_THEME_DARK: ThemeColors = {
  bgBase: "#0f1115",
  bgPanel: "#171a21",
  accentPrimary: "#6366f1",
  textPrimary: "#e5e7eb",
};

export const DEFAULT_THEME_LIGHT: ThemeColors = {
  bgBase: "#f4f5f7",
  bgPanel: "#ffffff",
  accentPrimary: "#4f46e5",
  textPrimary: "#1f2937",
};

const KEYS = {
  apiKeys: "aiDubberApiKeys",
  model: "aiDubberModel",
  tempPath: "aiDubberTempPath",
  exportPath: "aiDubberExportPath",
  themeDark: "aiDubberThemeDark",
  themeLight: "aiDubberThemeLight",
  mode: "aiDubberMode",
};

const hasWindow = () => typeof window !== "undefined";

export function loadSettings(): AppSettings {
  if (!hasWindow()) {
    return { model: DEFAULT_MODEL, tempPath: DEFAULT_TEMP_PATH, exportPath: DEFAULT_EXPORT_PATH, apiKeys: [] };
  }

  let apiKeys: string[] = [];
  try {
    const raw = localStorage.getItem(KEYS.apiKeys);
    if (raw) apiKeys = JSON.parse(raw) as string[];
  } catch {
    apiKeys = [];
  }

  return {
    model: localStorage.getItem(KEYS.model) || DEFAULT_MODEL,
    tempPath: localStorage.getItem(KEYS.tempPath) || DEFAULT_TEMP_PATH,
    exportPath: localStorage.getItem(KEYS.exportPath) || DEFAULT_EXPORT_PATH,
    apiKeys,
  };
}

export function saveApiKeys(keys: string[]): void {
  if (!hasWindow()) return;
  localStorage.setItem(KEYS.apiKeys, JSON.stringify(keys));
}

export function saveModel(model: string): void {
  if (!hasWindow()) return;
  localStorage.setItem(KEYS.model, model);
}

export function saveTempPath(path: string): void {
  if (!hasWindow()) return;
  localStorage.setItem(KEYS.tempPath, path);
}

export function saveExportPath(path: string): void {
  if (!hasWindow()) return;
  localStorage.setItem(KEYS.exportPath, path);
}

export function loadTheme(): { isDark: boolean; dark: ThemeColors; light: ThemeColors } {
  if (!hasWindow()) {
    return { isDark: true, dark: DEFAULT_THEME_DARK, light: DEFAULT_THEME_LIGHT };
  }

  const readTheme = (key: string, fallback: ThemeColors): ThemeColors => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return { ...fallback, ...(JSON.parse(raw) as Partial<ThemeColors>) };
    } catch {
      return fallback;
    }
  };

  return {
    isDark: localStorage.getItem(KEYS.mode) !== "light",
    dark: readTheme(KEYS.themeDark, DEFAULT_THEME_DARK),
    light: readTheme(KEYS.themeLight, DEFAULT_THEME_LIGHT),
  };
}

export function saveThemeMode(isDark: boolean): void {
  if (!hasWindow()) return;
  localStorage.setItem(KEYS.mode, isDark ? "dark" : "light");
}

export function saveTheme(isDark: boolean, colors: ThemeColors): void {
  if (!hasWindow()) return;
  localStorage.setItem(isDark ? KEYS.themeDark : KEYS.themeLight, JSON.stringify(colors));
}

export function resetTheme(isDark: boolean): void {
  if (!hasWindow()) return;
  localStorage.removeItem(isDark ? KEYS.themeDark : KEYS.themeLight);
}

export function loadExportPath(): string {
  if (!hasWindow()) return DEFAULT_EXPORT_PATH;
  return localStorage.getItem(KEYS.exportPath) || DEFAULT_EXPORT_PATH;
}
