"use client";

import { Moon, Sun, Settings, CircleUser, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function Header() {
  const { isDark, toggleMode, setSettingsOpen } = useApp();

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-[var(--bg-panel)] border-b border-[var(--border-color)] shadow-sm z-10 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-[var(--bg-base)] border border-[var(--border-light)] shadow-sm shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Dai Dubber logo"
            className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
            onError={(event) => {
              (event.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 leading-tight">
            <h1 className="text-lg font-semibold text-[var(--text-bright)]">Dai Dubber FREE</h1>
            <a
              href="https://t.me/daidubberpro_official/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors no-underline select-none"
              title="Upgrade to DAI Dubber PRO"
            >
              <Sparkles size={10} className="text-yellow-400" />
              <span className="text-[10px] font-black tracking-widest uppercase text-yellow-400">PRO</span>
            </a>
          </div>
          <p className="text-xs text-[var(--accent-text)] font-medium">Khmer Edition By DaCoding</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleMode}
          className="p-2 rounded-full bg-[var(--bg-hover)] hover:brightness-110 text-[var(--text-secondary)] transition-colors border border-[var(--border-light)]"
          title="Toggle Dark/Light Mode"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 rounded-full bg-[var(--bg-hover)] hover:brightness-110 text-[var(--text-secondary)] transition-colors border border-[var(--border-light)]"
          title="Application Settings"
        >
          <Settings size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-[var(--bg-hover)] flex items-center justify-center border-2 border-[var(--border-light)] text-[var(--text-primary)]">
          <CircleUser size={18} />
        </div>
      </div>
    </header>
  );
}
