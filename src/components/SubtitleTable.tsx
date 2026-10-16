"use client";

import { useRef } from "react";
import { Loader2, Play, ListMusic, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { parseTimeToSeconds, secondsToClock } from "@/lib/time";
import type { Gender } from "@/lib/types";

export default function SubtitleTable() {
  const {
    segments,
    setSegments,
    updateSegment,
    setAllVoices,
    selection,
    setSelection,
    isTranscribing,
    cancelTranscription,
    playSegment,
  } = useApp();

  const lastClickedIndex = useRef<number | null>(null);

  const isSelected = (id: string) => selection.includes(`text-${id}`) || selection.includes(`audio-${id}`);

  const toggleRow = (index: number, event: React.MouseEvent) => {
    const segment = segments[index];

    if (event.shiftKey && lastClickedIndex.current !== null) {
      const start = Math.min(index, lastClickedIndex.current);
      const end = Math.max(index, lastClickedIndex.current);
      const next = new Set(selection);
      for (let i = start; i <= end; i++) {
        next.add(`text-${segments[i].id}`);
        next.add(`audio-${segments[i].id}`);
      }
      setSelection(Array.from(next));
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      setSelection((prev) =>
        isSelected(segment.id)
          ? prev.filter((item) => item !== `text-${segment.id}` && item !== `audio-${segment.id}`)
          : [...prev, `text-${segment.id}`, `audio-${segment.id}`],
      );
      lastClickedIndex.current = index;
      return;
    }

    setSelection([`text-${segment.id}`, `audio-${segment.id}`]);
    lastClickedIndex.current = index;
  };

  const allSelected = segments.length > 0 && selection.length >= segments.length;

  return (
    <>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
          <ListMusic size={16} />
          Subtitle Data
        </div>
        {segments.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] flex items-center gap-1">
              <Users size={14} />
              Set all voices to:
            </span>
            <button
              onClick={() => setAllVoices("Male")}
              className="bg-[var(--bg-hover)] border border-[var(--border-light)] text-[var(--text-primary)] hover:text-white hover:bg-indigo-600 px-3 py-1 rounded transition-colors"
            >
              Male
            </button>
            <button
              onClick={() => setAllVoices("Female")}
              className="bg-[var(--bg-hover)] border border-[var(--border-light)] text-[var(--text-primary)] hover:text-white hover:bg-pink-600 px-3 py-1 rounded transition-colors"
            >
              Female
            </button>
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl flex flex-col flex-1 overflow-hidden shadow-sm">
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse text-sm relative">
            <thead className="bg-[var(--bg-panel)] text-[var(--text-secondary)] text-xs uppercase font-semibold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-3 py-3 border-b border-[var(--border-color)] w-10 text-center bg-[var(--bg-panel)]">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 cursor-pointer"
                    style={{ accentColor: "var(--accent-primary)" }}
                    checked={allSelected}
                    onChange={(event) => {
                      if (event.target.checked) {
                        const next: string[] = [];
                        segments.forEach((segment) => {
                          next.push(`text-${segment.id}`, `audio-${segment.id}`);
                        });
                        setSelection(next);
                      } else {
                        setSelection([]);
                      }
                    }}
                    disabled={segments.length === 0}
                  />
                </th>
                <th className="px-4 py-3 border-b border-[var(--border-color)] w-24 bg-[var(--bg-panel)]">Start</th>
                <th className="px-4 py-3 border-b border-[var(--border-color)] w-24 bg-[var(--bg-panel)]">End</th>
                <th className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-panel)]">Khmer Text (Editable)</th>
                <th className="px-4 py-3 border-b border-[var(--border-color)] w-32 bg-[var(--bg-panel)]">Voice Profile</th>
                <th className="px-4 py-3 border-b border-[var(--border-color)] w-28 text-center bg-[var(--bg-panel)]">Audio Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {segments.length > 0 ? (
                segments.map((segment, index) => {
                  const selected = isSelected(segment.id);
                  return (
                    <tr
                      key={segment.id}
                      className="group transition-colors cursor-pointer hover:bg-[var(--bg-hover)]"
                      style={{ borderLeft: `3px solid ${selected ? "var(--accent-primary)" : "transparent"}` }}
                      onClick={(event) => toggleRow(index, event)}
                    >
                      <td className="px-3 py-2 text-center" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer"
                          style={{ accentColor: "var(--accent-primary)" }}
                          checked={selected}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelection((prev) => [...prev, `text-${segment.id}`, `audio-${segment.id}`]);
                            } else {
                              setSelection((prev) =>
                                prev.filter((item) => item !== `text-${segment.id}` && item !== `audio-${segment.id}`),
                              );
                            }
                          }}
                        />
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-[var(--text-secondary)]">
                        {secondsToClock(parseTimeToSeconds(segment.textStart))}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-[var(--text-secondary)]">
                        {secondsToClock(parseTimeToSeconds(segment.textEnd))}
                      </td>
                      <td className="px-4 py-2" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="text"
                          value={segment.text}
                          onChange={(event) => {
                            const value = event.target.value;
                            setSegments((prev) =>
                              prev.map((item) => (item.id === segment.id ? { ...item, text: value } : item)),
                            );
                          }}
                          className="w-full bg-transparent border-none outline-none font-khmer text-[13px] tracking-wide text-[var(--text-primary)] focus:text-[var(--text-bright)]"
                        />
                      </td>
                      <td className="px-4 py-2" onClick={(event) => event.stopPropagation()}>
                        <select
                          value={segment.gender}
                          onChange={(event) => updateSegment(segment.id, { gender: event.target.value as Gender })}
                          className="bg-[var(--bg-base)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs rounded px-2 py-1 outline-none focus:border-[var(--accent-primary)]"
                        >
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-center" onClick={(event) => event.stopPropagation()}>
                        {segment.audioStatus === "idle" && (
                          <span className="text-xs text-[var(--text-muted)]">Pending</span>
                        )}
                        {segment.audioStatus === "generating" && (
                          <div className="flex justify-center">
                            <Loader2 size={16} className="animate-spin text-[var(--accent-text)]" />
                          </div>
                        )}
                        {segment.audioStatus === "ready" && (
                          <button
                            onClick={() => playSegment(segment)}
                            className="p-1.5 rounded-md transition-colors bg-[var(--bg-hover)] text-[var(--accent-text)] hover:brightness-110 mx-auto block border border-[var(--border-light)]"
                            title="Play generated Edge TTS"
                          >
                            <Play size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-[var(--text-muted)]">
                    {isTranscribing ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 size={32} className="animate-spin text-[var(--accent-text)]" />
                        <p>Processing video and transcribing via Gemini...</p>
                        <button onClick={cancelTranscription} className="mt-2 text-xs text-red-500 hover:brightness-110 underline">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p>No subtitles available. Upload a video and import or transcribe.</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
