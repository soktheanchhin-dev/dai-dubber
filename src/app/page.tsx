"use client";

import type { CSSProperties } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import Header from "@/components/Header";
import VideoPreview from "@/components/VideoPreview";
import WorkspaceTools from "@/components/WorkspaceTools";
import SubtitleTable from "@/components/SubtitleTable";
import Timeline from "@/components/Timeline";
import RenderModal from "@/components/RenderModal";
import SettingsModal from "@/components/SettingsModal";
import ToastContainer from "@/components/ToastContainer";

function DubberApp() {
  const { theme } = useApp();

  const themeVars = {
    "--bg-base": theme.bgBase,
    "--bg-panel": theme.bgPanel,
    "--accent-primary": theme.accentPrimary,
    "--text-primary": theme.textPrimary,
  } as CSSProperties;

  return (
    <div
      className="flex flex-col h-screen font-sans overflow-hidden transition-colors duration-200"
      style={{ ...themeVars, backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <Header />
      <main className="flex flex-1 overflow-hidden min-h-0">
        <div className="w-80 lg:w-96 flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border-color)] z-0 overflow-y-auto custom-scrollbar">
          <VideoPreview />
          <WorkspaceTools />
        </div>
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-base)] h-full">
          <div className="flex-1 p-4 min-h-0 overflow-hidden flex flex-col">
            <SubtitleTable />
          </div>
          <Timeline />
        </div>
      </main>
      <RenderModal />
      <SettingsModal />
      <ToastContainer />
    </div>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <DubberApp />
    </AppProvider>
  );
}
