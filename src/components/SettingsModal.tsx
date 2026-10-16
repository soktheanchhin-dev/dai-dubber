"use client";

import { useState } from "react";
import { Settings, X, Plus, Trash2, Link2, Facebook, Youtube } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { GEMINI_MODELS } from "@/lib/voices";
import type { ThemeColors } from "@/lib/types";

const COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: "bgBase", label: "Background Main" },
  { key: "bgPanel", label: "Background Panel" },
  { key: "accentPrimary", label: "Accent Color" },
  { key: "textPrimary", label: "Text Color" },
];

export default function SettingsModal() {
  const {
    settingsOpen,
    setSettingsOpen,
    settings,
    setModel,
    setTempPath,
    setExportPath,
    addApiKey,
    removeApiKey,
    isDark,
    theme,
    updateThemeColor,
    resetTheme,
  } = useApp();

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [tempPathInput, setTempPathInput] = useState(settings.tempPath);
  const [exportPathInput, setExportPathInput] = useState(settings.exportPath);

  if (!settingsOpen) return null;

  const commitApiKey = () => {
    if (apiKeyInput.trim() && !settings.apiKeys.includes(apiKeyInput.trim())) {
      addApiKey(apiKeyInput.trim());
      setApiKeyInput("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 modal-bg-enter">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-light)] rounded-2xl w-[500px] shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)] modal-enter">
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)] bg-[var(--bg-base)]">
          <h2 className="text-[var(--text-bright)] font-semibold flex items-center gap-2">
            <Settings size={18} className="text-[var(--accent-text)]" />
            Application Settings
          </h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-bright)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--text-bright)] font-medium">Gemini AI Model</label>
            <select
              value={settings.model}
              onChange={(event) => setModel(event.target.value)}
              className="bg-[var(--bg-base)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm rounded-lg focus:border-[var(--accent-primary)] block w-full p-2.5 outline-none"
            >
              {GEMINI_MODELS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Select the engine used for video transcription and translation.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-[var(--border-color)]">
            <h3 className="text-sm font-semibold text-[var(--text-bright)]">
              Theme Customization ({isDark ? "Dark" : "Light"} Mode)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {COLOR_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">{field.label}</label>
                  <input
                    type="color"
                    value={theme[field.key]}
                    onChange={(event) => updateThemeColor(field.key, event.target.value)}
                    className="w-full h-8 cursor-pointer rounded bg-transparent border-0"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={resetTheme}
              className="mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] self-start border border-[var(--border-light)] px-2 py-1 rounded transition-colors"
            >
              Reset Colors
            </button>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-[var(--border-color)]">
            <label className="text-sm text-[var(--text-bright)] font-medium">Generated Audio Temp Path</label>
            <input
              type="text"
              value={tempPathInput}
              onChange={(event) => setTempPathInput(event.target.value)}
              onBlur={() => setTempPath(tempPathInput)}
              placeholder={"C:\\Temp\\AIDubber"}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm rounded-lg focus:border-[var(--accent-primary)] p-2.5 outline-none font-mono"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Folder where Edge-TTS temporary audio files will be saved.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-[var(--border-color)]">
            <label className="text-sm text-[var(--text-bright)] font-medium">Save Path (For Exported Video)</label>
            <input
              type="text"
              value={exportPathInput}
              onChange={(event) => setExportPathInput(event.target.value)}
              onBlur={() => setExportPath(exportPathInput)}
              placeholder={"C:\\Export\\AIDubber"}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm rounded-lg focus:border-[var(--accent-primary)] p-2.5 outline-none font-mono"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              The folder where the rendered video will be saved.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-[var(--border-color)]">
            <label className="text-sm text-[var(--text-bright)] font-medium">Gemini API Keys (Failover Setup)</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(event) => setApiKeyInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && commitApiKey()}
                placeholder="AIzaSy..."
                className="flex-1 bg-[var(--bg-base)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm rounded-lg focus:border-[var(--accent-primary)] p-2.5 outline-none font-mono"
              />
              <button
                onClick={commitApiKey}
                className="bg-[var(--accent-primary)] hover:brightness-110 text-white px-4 rounded-lg flex items-center justify-center transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="mt-2 flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {settings.apiKeys.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic border border-dashed border-[var(--border-light)] p-3 rounded-lg text-center">
                  No API keys added. Transcription will not work.
                </p>
              ) : (
                settings.apiKeys.map((key, index) => (
                  <div
                    key={key}
                    className="flex justify-between items-center bg-[var(--bg-base)] border border-[var(--border-light)] p-2.5 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-panel)] px-2 py-1 rounded border border-[var(--border-color)]">
                        Key {index + 1}
                      </span>
                      <span className="text-sm font-mono text-[var(--text-primary)]">
                        {key.substring(0, 8)}...{key.substring(key.length - 4)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeApiKey(key)}
                      className="text-[var(--text-secondary)] hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Keys are saved locally. If a key hits rate limits or fails, the system automatically tries the next one.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-[var(--border-color)]">
            <h3 className="text-sm font-semibold text-[var(--text-bright)]">About DaCoding</h3>
            <div className="flex flex-col gap-2 text-xs">
              <a
                href="https://web.facebook.com/dacodingofficial"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-text)] hover:underline flex items-center gap-1.5"
              >
                <Facebook size={14} /> Official Facebook Page
              </a>
              <a
                href="https://t.me/+KWSBSiCHbNVmMzg1"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-text)] hover:underline flex items-center gap-1.5"
              >
                <Link2 size={14} /> Official Telegram Channel
              </a>
              <a
                href="https://www.youtube.com/@dacoding8563"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-text)] hover:underline flex items-center gap-1.5"
              >
                <Youtube size={14} /> YouTube Channel
              </a>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-base)] flex justify-end">
          <button
            onClick={() => setSettingsOpen(false)}
            className="bg-[var(--bg-panel)] hover:brightness-110 text-[var(--text-bright)] px-6 py-2 rounded-lg text-sm transition-colors font-medium border border-[var(--border-light)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
