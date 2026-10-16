"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, Square, Play, Volume2, VolumeX, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { parseTimeToSeconds, secondsToClock } from "@/lib/time";
import type { SubtitleSegment } from "@/lib/types";

type DragMode = "move" | "resize-right" | "resize-track";

export default function Timeline() {
  const {
    segments,
    setSegments,
    updateSegment,
    videoDuration,
    videoUrl,
    selection,
    setSelection,
    isTranscribing,
    startTranscription,
    cancelTranscription,
    isGeneratingAudio,
    generateSelectedAudio,
    stopAudioGeneration,
    bgm,
    updateBgm,
    removeBgm,
  } = useApp();

  const [zoom, setZoom] = useState(100);
  const [heights, setHeights] = useState({ t1: 44, a1: 44, a2: 44 });
  const [playhead, setPlayhead] = useState(0);
  const tracksRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<SubtitleSegment[][]>([]);

  useEffect(() => {
    const video = document.querySelector("video");
    if (!video) return;
    const handler = () => setPlayhead(video.currentTime);
    video.addEventListener("timeupdate", handler);
    return () => video.removeEventListener("timeupdate", handler);
  }, [videoUrl]);

  const selectedSegments = useMemo(
    () => segments.filter((segment) => selection.includes(`text-${segment.id}`) || selection.includes(`audio-${segment.id}`)),
    [segments, selection],
  );

  const rulerMarks = useMemo(() => {
    if (videoDuration <= 0) return [];
    const raw = 15 * (zoom / 100);
    let step = raw;
    const candidate = [1, 2, 5, 10, 15, 30, 60, 120, 300].find((value) => value >= raw);
    if (candidate) step = candidate;
    const marks: number[] = [];
    for (let t = 0; t <= videoDuration; t += step) marks.push(Math.round(t * 100) / 100);
    return marks;
  }, [videoDuration, zoom]);

  const commitHistory = useCallback((snapshot: SubtitleSegment[]) => {
    historyRef.current = [...historyRef.current.slice(-49), snapshot.map((item) => ({ ...item }))];
  }, []);

  const beginDrag = useCallback(
    (
      event: React.MouseEvent,
      target: { type: "text" | "audio" | "bgm"; id: string },
      mode: DragMode,
      track: "t1" | "a1" | "a2" = "t1",
    ) => {
      event.preventDefault();
      event.stopPropagation();
      const container = tracksRef.current;
      if (!container) return;
      const width = container.clientWidth;
      if (width === 0) return;

      const startX = event.clientX;
      const startY = event.clientY;
      const segment = segments.find((item) => item.id === target.id);
      const snapshot = segments.map((item) => ({ ...item }));

      const startValue =
        target.type === "audio"
          ? [parseTimeToSeconds(segment?.audioStart), parseTimeToSeconds(segment?.audioEnd)]
          : [parseTimeToSeconds(segment?.textStart), parseTimeToSeconds(segment?.textEnd)];
      const bgmStart = bgm.start;
      const bgmVolume = bgm.volume;
      const baseHeight = heights[track];

      const onMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaSeconds = (deltaX / width) * (videoDuration || 0);

        if (mode === "resize-track") {
          const deltaY = moveEvent.clientY - startY;
          setHeights((prev) => ({ ...prev, [track]: Math.max(28, baseHeight + deltaY) }));
          return;
        }

        if (target.type === "bgm") {
          if (mode === "move") {
            updateBgm({ start: Math.max(0, Math.min(videoDuration, bgmStart + deltaSeconds)) });
          }
          return;
        }

        const [origStart, origEnd] = startValue;
        if (mode === "move") {
          let newStart = origStart + deltaSeconds;
          let newEnd = origEnd + deltaSeconds;
          if (newStart < 0) {
            newEnd -= newStart;
            newStart = 0;
          }
          if (newEnd > videoDuration) {
            newStart -= newEnd - videoDuration;
            newEnd = videoDuration;
          }
          newStart = Math.max(0, newStart);

          if (target.type === "audio") {
            updateSegment(target.id, { audioStart: newStart.toFixed(2), audioEnd: newEnd.toFixed(2) });
          } else {
            updateSegment(target.id, {
              textStart: newStart.toFixed(2),
              textEnd: newEnd.toFixed(2),
              audioStart: newStart.toFixed(2),
              audioEnd: newEnd.toFixed(2),
            });
          }
        } else if (mode === "resize-right") {
          const newEnd = Math.max(origStart + 0.1, Math.min(videoDuration, origEnd + deltaSeconds));
          if (target.type === "audio") {
            updateSegment(target.id, { audioEnd: newEnd.toFixed(2) });
          } else {
            updateSegment(target.id, {
              textEnd: newEnd.toFixed(2),
              audioEnd: newEnd.toFixed(2),
            });
          }
        }
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        commitHistory(snapshot);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [segments, bgm.start, bgm.volume, heights, videoDuration, updateSegment, updateBgm, commitHistory],
  );

  const applySpeed = (speed: number) => {
    if (Number.isNaN(speed)) return;
    setSegments((prev) =>
      prev.map((segment) => {
        if (!selectedSegments.some((item) => item.id === segment.id)) return segment;
        let audioEnd = parseTimeToSeconds(segment.audioEnd);
        if (segment.baseAudioDuration) {
          audioEnd = parseFloat(
            (
              parseTimeToSeconds(segment.audioStart) +
              segment.baseAudioDuration / speed
            ).toFixed(2),
          );
        }
        return { ...segment, speed, audioEnd: String(audioEnd) };
      }),
    );
  };

  const seekTo = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest(".track-block")) return;
    const container = tracksRef.current;
    const video = document.querySelector("video");
    if (!container || !video || videoDuration <= 0) return;
    const rect = container.getBoundingClientRect();
    video.currentTime = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * videoDuration;
  };

  const renderTextBlocks = () =>
    segments.map((segment) => {
      if (videoDuration <= 0) return null;
      const left = (parseTimeToSeconds(segment.textStart) / videoDuration) * 100;
      const width = ((parseTimeToSeconds(segment.textEnd) - parseTimeToSeconds(segment.textStart)) / videoDuration) * 100;
      const selected = selection.includes(`text-${segment.id}`);
      return (
        <div
          key={segment.id}
          className={`track-block absolute rounded border text-[10px] text-white px-2 flex items-center overflow-hidden whitespace-nowrap font-khmer cursor-move select-none ${
            selected ? "bg-[var(--accent-primary)] border-white/60" : "bg-indigo-600/70 border-[var(--border-light)]"
          }`}
          style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%`, top: 4, bottom: 4 }}
          title={segment.text}
          onMouseDown={(event) => {
            beginDrag(event, { type: "text", id: segment.id }, "move", "t1");
          }}
        >
          {segment.text}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/40 z-30 transition-colors"
            onMouseDown={(event) => beginDrag(event, { type: "text", id: segment.id }, "resize-right", "t1")}
          />
        </div>
      );
    });

  const renderAudioBlocks = () =>
    segments.map((segment) => {
      if (videoDuration <= 0 || segment.audioStatus === "idle") return null;
      const left = (parseTimeToSeconds(segment.audioStart) / videoDuration) * 100;
      const width = ((parseTimeToSeconds(segment.audioEnd) - parseTimeToSeconds(segment.audioStart)) / videoDuration) * 100;
      return (
        <div
          key={`audio-${segment.id}`}
          className={`track-block absolute rounded border text-[10px] text-white px-2 flex items-center overflow-hidden whitespace-nowrap cursor-move select-none ${
            segment.audioStatus === "generating"
              ? "bg-[var(--accent-primary)] bg-opacity-50 animate-pulse"
              : "bg-emerald-600/70 border-[var(--border-light)]"
          }`}
          style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%`, top: 4, bottom: 4 }}
          onMouseDown={(event) => beginDrag(event, { type: "audio", id: segment.id }, "move", "a1")}
        >
          {segment.audioStatus === "generating" && <Loader2 size={12} className="mr-1 animate-spin" />}
          <span className="font-mono text-[9px]">{(segment.speed || 1).toFixed(1)}x</span>
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/40 z-30 transition-colors"
            onMouseDown={(event) => beginDrag(event, { type: "audio", id: segment.id }, "resize-right", "a1")}
          />
        </div>
      );
    });

  return (
    <div className="border-t border-[var(--border-color)] bg-[var(--bg-panel)] flex flex-col shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.5)] shrink-0 z-20 transition-all">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-base)] shrink-0">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-semibold text-[var(--text-bright)]">Timeline Editor</span>
          <div className="h-4 w-px bg-[var(--border-light)]" />
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)]">Zoom:</span>
            <input
              type="range"
              min="100"
              max="1000"
              className="w-24"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
            <span className="text-[10px] text-[var(--text-muted)] font-mono w-8">{zoom}%</span>
          </div>
          {selectedSegments.length > 0 && (
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-[var(--border-light)]">
              <span className="text-[var(--text-secondary)] font-medium">Speed:</span>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="2.5"
                value={selectedSegments[0]?.speed || 1}
                onChange={(event) => applySpeed(parseFloat(event.target.value))}
                className="bg-[var(--bg-base)] border border-[var(--border-light)] text-[var(--text-primary)] px-2 py-0.5 rounded text-xs w-14 outline-none focus:border-[var(--accent-primary)] text-center"
              />
              <span className="text-[var(--text-muted)] font-mono">x</span>
              {selectedSegments.length > 1 && (
                <span className="text-[10px] text-[var(--accent-text)] ml-1">({selectedSegments.length} items)</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => (isTranscribing ? cancelTranscription() : void startTranscription())}
            disabled={!isTranscribing && !videoUrl}
            className={`px-3 py-1.5 rounded text-xs transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50 text-white ${
              isTranscribing ? "bg-red-600 hover:brightness-110" : "bg-emerald-600 hover:brightness-110"
            }`}
          >
            {isTranscribing ? <Square size={14} className="fill-current" /> : <Sparkles size={14} />}
            {isTranscribing ? "Stop Transcribing" : "Transcribe"}
          </button>
          <button
            onClick={() => (isGeneratingAudio ? stopAudioGeneration() : void generateSelectedAudio())}
            disabled={!isGeneratingAudio && selectedSegments.length === 0}
            className={`px-3 py-1.5 rounded text-xs transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50 text-white ${
              isGeneratingAudio ? "bg-red-600 hover:brightness-110" : "bg-[var(--accent-primary)] hover:brightness-110"
            }`}
          >
            {isGeneratingAudio ? <Square size={14} className="fill-current" /> : <Play size={14} />}
            {isGeneratingAudio ? "Stop Generation" : "Generate Selected Audio"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[var(--bg-base)] custom-scrollbar relative h-[280px]">
        <div className="h-full relative min-w-full" style={{ width: `${zoom}%` }} ref={tracksRef} onMouseDown={seekTo}>
          <div className="absolute top-0 left-0 right-0 h-6 border-b border-[var(--border-color)] bg-[var(--bg-panel)] pointer-events-none z-10 ruler-bg">
            {rulerMarks.map((mark) => (
              <div
                key={mark}
                className="absolute bottom-0 h-2 border-l border-[var(--border-light)] text-[9px] text-[var(--text-muted)] font-mono"
                style={{ left: videoDuration > 0 ? `${(mark / videoDuration) * 100}%` : "0%" }}
              >
                <span className="absolute -top-4 -left-3 select-none">{secondsToClock(mark)}</span>
              </div>
            ))}
          </div>

          <div
            className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
            style={{ left: videoDuration > 0 ? `${(playhead / videoDuration) * 100}%` : "0%" }}
          >
            <div className="absolute -top-1 -left-1.5 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-red-500" />
          </div>

          <div className="pt-8 px-2 pb-32 flex flex-col gap-2 relative z-20 min-h-full">
            <div
              className="bg-[var(--bg-panel)] rounded border border-[var(--border-color)] flex items-center relative group shrink-0"
              style={{ height: heights.t1 }}
            >
              <div className="absolute left-2 text-[10px] text-[var(--text-secondary)] font-medium z-30 bg-[var(--bg-base)] px-1 rounded shadow-md flex items-center gap-1">
                T1
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    if (segments.length !== 0 && window.confirm("Clear all subtitles from T1 track?")) {
                      commitHistory(segments);
                      setSegments([]);
                    }
                  }}
                  className="hover:text-red-500 text-[var(--text-muted)] transition-colors"
                  title="Clear T1 subtitle track"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              {renderTextBlocks()}
              <div
                className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize hover:bg-[var(--accent-primary)] z-40 transition-colors"
                onMouseDown={(event) => beginDrag(event, { type: "text", id: "__track__" }, "resize-track", "t1")}
              />
            </div>

            <div
              className="bg-[var(--bg-panel)] rounded border border-[var(--border-color)] flex items-center relative group shrink-0"
              style={{ height: heights.a1 }}
            >
              <div className="absolute left-2 text-[10px] text-[var(--text-secondary)] font-medium z-30 bg-[var(--bg-base)] px-1 rounded shadow-md flex items-center gap-1">
                A1
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    if (segments.some((segment) => segment.audioUrl) && window.confirm("Clear all generated audio from A1 track?")) {
                      commitHistory(segments);
                      setSegments((prev) =>
                        prev.map((segment) => ({
                          ...segment,
                          audioStatus: "idle",
                          audioUrl: null,
                          audioStart: segment.textStart,
                          audioEnd: segment.textEnd,
                        })),
                      );
                    }
                  }}
                  className="hover:text-red-500 text-[var(--text-muted)] transition-colors"
                  title="Clear A1 audio track"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              {renderAudioBlocks()}
              <div
                className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize hover:bg-[var(--accent-primary)] z-40 transition-colors"
                onMouseDown={(event) => beginDrag(event, { type: "audio", id: "__track__" }, "resize-track", "a1")}
              />
            </div>

            {bgm.src && (
              <div
                className="bg-[var(--bg-panel)] rounded border border-[var(--border-color)] flex items-center relative group shrink-0"
                style={{ height: heights.a2 }}
              >
                <div className="absolute left-2 text-[10px] text-[var(--text-secondary)] font-medium z-30 bg-[var(--bg-base)] px-1 rounded shadow-md flex items-center gap-1">
                  A2
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      updateBgm({ isMuted: !bgm.isMuted });
                    }}
                    className="hover:text-[var(--text-bright)]"
                    title={bgm.isMuted ? "Unmute BGM" : "Mute BGM"}
                  >
                    {bgm.isMuted ? <VolumeX size={10} className="text-red-400" /> : <Volume2 size={10} />}
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      if (window.confirm("Remove background music track?")) removeBgm();
                    }}
                    className="hover:text-red-500 text-[var(--text-muted)] transition-colors"
                    title="Remove A2 BGM track"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
                {videoDuration > 0 && (
                  <div
                    className="track-block absolute rounded border text-[10px] text-white px-2 flex items-center overflow-hidden whitespace-nowrap bg-purple-600/70 border-[var(--border-light)] cursor-move select-none"
                    style={{
                      left: `${(bgm.start / videoDuration) * 100}%`,
                      width: `${Math.max(((bgm.duration || videoDuration - bgm.start) / videoDuration) * 100, 1)}%`,
                      top: 4,
                      bottom: 4,
                    }}
                    onMouseDown={(event) => beginDrag(event, { type: "bgm", id: "bgm" }, "move", "a2")}
                  >
                    {bgm.name}
                  </div>
                )}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize hover:bg-[var(--accent-primary)] z-40 transition-colors"
                  onMouseDown={(event) => beginDrag(event, { type: "bgm", id: "bgm" }, "resize-track", "a2")}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
