export function clampSeconds(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Parses a time value that may be a number of seconds or a string in the form
 * `HH:MM:SS.mmm`, `MM:SS`, or a plain numeric string.
 */
export function parseTimeToSeconds(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const trimmed = value.trim();
  if (trimmed === "") return 0;

  if (!trimmed.includes(":")) {
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n : 0;
  }

  const parts = trimmed.split(":");
  let seconds = 0;
  for (const part of parts) {
    seconds = seconds * 60 + (parseFloat(part) || 0);
  }
  return seconds;
}

/** Formats seconds as `HH:MM:SS,mmm` (SRT timestamp). */
export function secondsToSrtTime(totalSeconds: number): string {
  const pad = (value: number, width: number) => ("000" + value).slice(-width);
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = Math.floor(clamped % 60);
  const millis = Math.floor((clamped % 1) * 1000);
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(millis, 3)}`;
}

/** Formats seconds as `MM:SS.mm` for the on-screen clock. */
export function secondsToClock(value: number): string {
  if (!Number.isFinite(value)) return "00:00.00";
  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (value % 60).toFixed(2).padStart(5, "0");
  return `${minutes}:${seconds}`;
}
