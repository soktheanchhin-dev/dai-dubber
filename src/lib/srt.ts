import type { Gender, SubtitleSegment } from "./types";
import { parseTimeToSeconds, secondsToSrtTime } from "./time";

export function buildSrt(segments: SubtitleSegment[]): string {
  return segments
    .map((segment, index) => {
      const start = secondsToSrtTime(parseTimeToSeconds(segment.textStart));
      const end = secondsToSrtTime(parseTimeToSeconds(segment.textEnd));
      return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`;
    })
    .join("\n");
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().substring(0, 8);
  }
  return Math.random().toString(36).substring(2, 10);
}

function createSegment(start: number, end: number, text: string, gender: Gender): SubtitleSegment {
  let safeStart = Math.max(0, start);
  let safeEnd = end;
  if (safeEnd <= safeStart) safeEnd = safeStart + 0.5;

  return {
    id: createId(),
    textStart: safeStart.toFixed(2),
    textEnd: safeEnd.toFixed(2),
    audioStart: safeStart.toFixed(2),
    audioEnd: safeEnd.toFixed(2),
    text,
    voice: "KH Khmer",
    gender,
    status: "pending",
    audioStatus: "idle",
    audioUrl: null,
    baseAudioDuration: 0,
    speed: 1,
  };
}

export function parseSrt(content: string): SubtitleSegment[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n\s*\n/);
  const segments: SubtitleSegment[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) continue;

    const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeLineIndex === -1) continue;

    const timeLine = lines[timeLineIndex];
    const [rawStart, rawEnd] = timeLine.split("-->").map((part) => part.trim());
    const start = parseTimeToSeconds(rawStart.replace(",", "."));
    const end = parseTimeToSeconds(rawEnd.replace(",", "."));
    const text = lines
      .slice(timeLineIndex + 1)
      .join(" ")
      .trim();

    if (text === "") continue;
    segments.push(createSegment(start, end, text, "Female"));
  }

  return segments;
}
