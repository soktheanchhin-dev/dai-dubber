"use client";

import { Film, X, CheckCircle2, FolderOpen } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function RenderModal() {
  const { render, closeRenderModal, setRenderTitle, startRender, revealExportFolder } = useApp();

  if (!render.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 modal-bg-enter">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-light)] rounded-xl w-[450px] shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)] modal-enter">
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)] bg-[var(--bg-base)]">
          <h2 className="text-[var(--text-bright)] font-semibold flex items-center gap-2">
            <Film size={18} className="text-[var(--accent-primary)]" />
            Final Render
          </h2>
          {!render.isRendering && (
            <button
              onClick={closeRenderModal}
              className="text-[var(--text-secondary)] hover:text-[var(--text-bright)] transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6 flex flex-col gap-4">
          {render.success ? (
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-[var(--text-bright)] font-medium">Render Complete!</p>
              <p className="text-xs text-[var(--text-muted)] text-center mb-2">Video has been compiled successfully!</p>
              <button
                onClick={() => void revealExportFolder()}
                className="bg-[var(--accent-primary)] hover:brightness-110 text-white px-6 py-2 rounded-lg text-sm transition-colors font-medium mt-2 text-center flex items-center gap-2"
              >
                <FolderOpen size={16} />
                Open Video Path
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-[var(--text-bright)]">Export Filename</label>
                <input
                  type="text"
                  value={render.title}
                  onChange={(event) => setRenderTitle(event.target.value)}
                  disabled={render.isRendering}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-light)] text-[var(--text-primary)] rounded-lg p-2 outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
                />
              </div>

              {render.error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-xs">
                  {render.error}
                </div>
              )}

              {render.isRendering && (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                    <span>Rendering Audio &amp; Video (FFmpeg)...</span>
                    <span>{render.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--bg-base)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent-primary)] transition-all duration-150"
                      style={{ width: `${render.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-base)] flex justify-end gap-2">
          {!render.isRendering && !render.success && (
            <>
              <button
                onClick={closeRenderModal}
                className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--bg-hover)] border border-[var(--border-light)]"
              >
                Cancel
              </button>
              <button
                onClick={() => void startRender()}
                className="bg-[var(--accent-primary)] hover:brightness-110 text-white px-6 py-2 rounded-lg text-sm transition-colors font-medium"
              >
                Start Render
              </button>
            </>
          )}
          {render.success && (
            <button
              onClick={closeRenderModal}
              className="bg-[var(--bg-hover)] hover:brightness-110 border border-[var(--border-light)] text-[var(--text-bright)] px-6 py-2 rounded-lg text-sm transition-colors font-medium"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
