"use client";

import { useRef } from "react";
import {
  Upload,
  Music,
  Volume2,
  VolumeX,
  FileText,
  FileInput,
  Clapperboard,
  Trash2,
  Wrench,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function WorkspaceTools() {
  const {
    loadVideo,
    loadBgm,
    isOriginalAudioMuted,
    toggleOriginalAudio,
    exportSrt,
    importSrt,
    openRenderModal,
    clearAll,
  } = useApp();

  const videoInput = useRef<HTMLInputElement>(null);
  const bgmInput = useRef<HTMLInputElement>(null);
  const srtInput = useRef<HTMLInputElement>(null);

  return (
    <div className="px-4 pb-4 flex flex-col gap-3 flex-1 min-h-0">
      <h2 className="text-sm font-semibold text-[var(--text-bright)] flex items-center gap-2 mt-2">
        <Wrench size={16} className="text-[var(--accent-text)]" />
        Workspace Tools
      </h2>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="file"
          accept="video/*"
          ref={videoInput}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) loadVideo(file);
            event.target.value = "";
          }}
        />
        <button
          onClick={() => videoInput.current?.click()}
          className="flex flex-col items-center justify-center gap-2 bg-[var(--bg-hover)] hover:brightness-110 border border-[var(--border-light)] p-3 rounded-xl transition-colors"
        >
          <Upload size={20} className="text-blue-500" />
          <span className="text-xs font-medium">Load Video</span>
        </button>

        <input
          type="file"
          accept="audio/*"
          ref={bgmInput}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) loadBgm(file);
            event.target.value = "";
          }}
        />
        <button
          onClick={() => bgmInput.current?.click()}
          className="flex flex-col items-center justify-center gap-2 bg-[var(--bg-hover)] hover:brightness-110 border border-[var(--border-light)] p-3 rounded-xl transition-colors"
        >
          <Music size={20} className="text-purple-500" />
          <span className="text-xs font-medium">Load BGM</span>
        </button>

        <button
          onClick={toggleOriginalAudio}
          className="flex flex-col items-center justify-center gap-2 border border-[var(--border-light)] p-3 rounded-xl transition-colors bg-[var(--bg-hover)] hover:brightness-110"
        >
          {isOriginalAudioMuted ? <VolumeX size={20} className="text-red-400" /> : <Volume2 size={20} className="text-emerald-500" />}
          <span className="text-xs font-medium">{isOriginalAudioMuted ? "Audio Muted" : "Mute Audio"}</span>
        </button>

        <button
          onClick={() => void exportSrt()}
          className="flex flex-col items-center justify-center gap-2 bg-[var(--bg-hover)] hover:brightness-110 border border-[var(--border-light)] p-3 rounded-xl transition-colors"
        >
          <FileText size={20} className="text-cyan-500" />
          <span className="text-xs font-medium">Export SRT</span>
        </button>

        <input
          type="file"
          accept=".srt"
          ref={srtInput}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importSrt(file);
            event.target.value = "";
          }}
        />
        <button
          onClick={() => srtInput.current?.click()}
          className="flex flex-col items-center justify-center gap-2 bg-[var(--bg-hover)] hover:brightness-110 border border-[var(--border-light)] p-3 rounded-xl transition-colors col-span-2"
        >
          <FileInput size={20} className="text-amber-500" />
          <span className="text-xs font-medium">Import Subtitles (SRT)</span>
        </button>
      </div>

      <div className="mt-auto pt-4 flex flex-col gap-2">
        <button
          onClick={openRenderModal}
          className="w-full py-2 bg-[var(--accent-primary)] hover:brightness-110 border border-[var(--accent-primary)] shadow-lg rounded-lg text-sm transition-colors text-white flex items-center justify-center gap-2"
        >
          <Clapperboard size={16} />
          Final Render
        </button>
        <button
          onClick={clearAll}
          className="w-full py-2 bg-[var(--bg-hover)] hover:brightness-110 text-red-500 border border-[var(--border-light)] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 size={14} />
          Clear All Data
        </button>
      </div>
    </div>
  );
}
