import type { SubtitleSegment } from "./types";
import { parseTimeToSeconds } from "./time";

const UPLOAD_ENDPOINT = "https://generativelanguage.googleapis.com/upload/v1beta/files";
const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";

const TRANSCRIBE_PROMPT =
  "You are a professional movie/video dubbing translator. " +
  "Listen carefully to all spoken dialogue in this video, understand the context, and translate the spoken dialogue into natural, fluent, and meaningful Khmer language (បកប្រែជាភាសាខ្មែរឱ្យមានន័យត្រឹមត្រូវ ពិរោះ និងងាយយល់). " +
  "DO NOT transcribe phonetically or generate random nonsensical Khmer characters. The 'text' MUST be grammatically correct, natural Khmer sentences that make complete sense in context. " +
  "Provide precise start and end timestamps for each speech segment matching the original audio timing. " +
  "Return ONLY a raw JSON array of objects with keys: 'start', 'end', 'text' (natural Khmer translation string), " +
  "'emotion', 'voice', and 'gender' ('Male' or 'Female'). Do not wrap in markdown blocks.\n" +
  "CRITICAL INSTRUCTION: You MUST strictly format timestamps as HH:MM:SS.sss (e.g. 00:02:49.120). " +
  "Always include 00 for hours. Return ONLY a raw JSON array. No markdown.";

export class TranscriptionError extends Error {
  constructor(
    message: string,
    readonly rateLimited = false,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "TranscriptionError";
  }
}

export class TranscriptionCancelled extends Error {
  constructor() {
    super("Transcription cancelled");
    this.name = "TranscriptionCancelled";
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().substring(0, 8);
  }
  return Math.random().toString(36).substring(2, 10);
}

interface RawGeminiItem {
  start?: string | number;
  end?: string | number;
  startTime?: string | number;
  endTime?: string | number;
  start_time?: string | number;
  end_time?: string | number;
  text?: string;
  text_khmer?: string;
  khmer_text?: string;
  content?: string;
  transcription?: string;
}

function pick(raw: RawGeminiItem, keys: (keyof RawGeminiItem)[]): string | number | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

async function apiErrorMessage(response: Response, action: string): Promise<string> {
  const body = await response.text();
  let detail = "";

  if (body) {
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } };
      detail = parsed.error?.message ?? body;
    } catch {
      detail = body;
    }
  }

  const suffix = detail ? `: ${detail.slice(0, 500)}` : "";
  return `${action} failed (HTTP ${response.status})${suffix}`;
}

const MODEL_FALLBACKS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

const MAX_TRANSIENT_RETRIES = 2;

function buildModelCandidates(model: string): string[] {
  return [...new Set([model, ...MODEL_FALLBACKS.filter((candidate) => candidate !== model)])].filter(Boolean);
}

function isTransientServerError(error: unknown): error is TranscriptionError {
  return error instanceof TranscriptionError && error.statusCode !== undefined && error.statusCode >= 500;
}

function isModelUnavailableError(error: unknown): boolean {
  if (!(error instanceof TranscriptionError)) return false;
  if (error.statusCode === 404 || error.statusCode === 400) {
    const message = error.message.toLowerCase();
    return (
      message.includes("model") &&
      (message.includes("not available") ||
        message.includes("no longer available") ||
        message.includes("not found") ||
        message.includes("unsupported"))
    );
  }
  return false;
}

function waitBeforeRetry(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new TranscriptionCancelled());

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      reject(new TranscriptionCancelled());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function uploadFile(file: File, key: string, signal: AbortSignal): Promise<{ uri: string; name: string }> {
  const response = await fetch(`${UPLOAD_ENDPOINT}?key=${key}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "raw",
      "X-Goog-Upload-Header-Content-Type": file.type || "video/mp4",
    },
    body: file,
    signal,
  });

  if (response.status === 429) throw new TranscriptionError("RATE_LIMIT_EXCEEDED", true);
  if (!response.ok) throw new TranscriptionError(await apiErrorMessage(response, "Video upload"), false, response.status);

  const json = (await response.json()) as { file: { uri: string; name: string } };
  return { uri: json.file.uri, name: json.file.name };
}

async function waitForProcessing(name: string, key: string, signal: AbortSignal): Promise<void> {
  for (;;) {
    if (signal.aborted) throw new TranscriptionCancelled();
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const response = await fetch(`${API_ROOT}/${name}?key=${key}`, { signal });
    if (!response.ok) {
      throw new TranscriptionError(await apiErrorMessage(response, "Checking uploaded video status"), false, response.status);
    }

    const state = ((await response.json()) as { state?: string }).state;
    if (state === "FAILED") throw new TranscriptionError("Gemini failed to process the video.");
    if (state === "ACTIVE") return;
    if (state !== "PROCESSING") {
      throw new TranscriptionError(`Gemini returned an unexpected video processing state: ${state ?? "missing"}.`);
    }
  }
}

async function generateContentOnce(
  fileUri: string,
  mimeType: string,
  model: string,
  key: string,
  signal: AbortSignal,
): Promise<RawGeminiItem[]> {
  const response = await fetch(`${API_ROOT}/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: TRANSCRIBE_PROMPT }, { fileData: { mimeType, fileUri } }],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    }),
    signal,
  });

  if (response.status === 429) throw new TranscriptionError("RATE_LIMIT_EXCEEDED", true);
  if (!response.ok) throw new TranscriptionError(await apiErrorMessage(response, "Gemini transcription"), false, response.status);

  const json = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!text) {
    const reason = json.promptFeedback?.blockReason ?? candidate?.finishReason;
    throw new TranscriptionError(
      reason ? `Gemini returned no transcription text (${reason}).` : "Gemini returned no transcription text.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/```json/gi, "").replace(/```/g, "").trim());
  } catch {
    throw new TranscriptionError("Gemini returned text that could not be parsed as JSON.");
  }
  if (!Array.isArray(parsed)) throw new TranscriptionError("AI did not return a valid JSON array.");
  return parsed as RawGeminiItem[];
}

async function generateContent(
  fileUri: string,
  mimeType: string,
  model: string,
  key: string,
  signal: AbortSignal,
): Promise<RawGeminiItem[]> {
  let lastError: TranscriptionError | undefined;

  for (const candidateModel of buildModelCandidates(model)) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await generateContentOnce(fileUri, mimeType, candidateModel, key, signal);
      } catch (error) {
        if (!(error instanceof TranscriptionError)) throw error;
        lastError = error;

        if (isTransientServerError(error) && attempt < MAX_TRANSIENT_RETRIES) {
          await waitBeforeRetry(1000 * 2 ** attempt, signal);
          continue;
        }
        if (!isModelUnavailableError(error)) {
          throw error;
        }
        break;
      }
    }
  }

  throw lastError ?? new TranscriptionError("Gemini transcription failed.");
}

function normalizeItems(items: RawGeminiItem[], videoDuration: number): SubtitleSegment[] {
  return items.map((item) => {
    const rawStart = pick(item, ["start", "startTime", "start_time"]) ?? 0;
    const rawEnd = pick(item, ["end", "endTime", "end_time"]) ?? 0;
    const text = String(pick(item, ["text", "text_khmer", "khmer_text", "content", "transcription"]) ?? "");

    let start = parseFloat(parseTimeToSeconds(rawStart).toFixed(2));
    let end = parseFloat(parseTimeToSeconds(rawEnd).toFixed(2));

    if (start < 0) start = 0;
    if (end <= start) end = parseFloat((start + 0.5).toFixed(2));

    if (videoDuration > 0) {
      if (start > videoDuration) start = parseFloat((videoDuration - 0.5).toFixed(2));
      if (end > videoDuration) end = parseFloat(videoDuration.toFixed(2));
      if (start < 0) start = 0;
    }

    return {
      id: createId(),
      textStart: String(start),
      textEnd: String(end),
      audioStart: String(start),
      audioEnd: String(end),
      text,
      voice: "KH Khmer",
      gender: "Female",
      status: "pending",
      audioStatus: "idle",
      audioUrl: null,
      baseAudioDuration: 0,
      speed: 1,
    };
  });
}

export interface TranscribeOptions {
  videoFile: File;
  apiKeys: string[];
  model: string;
  videoDuration: number;
  signal: AbortSignal;
}

export async function transcribeVideo(options: TranscribeOptions): Promise<SubtitleSegment[]> {
  const { videoFile, apiKeys, model, videoDuration, signal } = options;
  if (apiKeys.length === 0) {
    throw new TranscriptionError("Add a Gemini API key in Settings before transcribing.");
  }

  let lastError = "Unknown error";

  for (let index = 0; index < apiKeys.length; index++) {
    if (signal.aborted) throw new TranscriptionCancelled();
    const key = apiKeys[index];

    try {
      const { uri, name } = await uploadFile(videoFile, key, signal);
      await waitForProcessing(name, key, signal);
      const items = await generateContent(uri, videoFile.type || "video/mp4", model, key, signal);
      return normalizeItems(items, videoDuration);
    } catch (error) {
      if (error instanceof TranscriptionCancelled || (error instanceof DOMException && error.name === "AbortError")) {
        throw new TranscriptionCancelled();
      }
      lastError = error instanceof Error ? error.message : "UNKNOWN";
    }
  }

  if (lastError === "RATE_LIMIT_EXCEEDED") {
    throw new TranscriptionError(
      "All API keys have hit Google rate limits. Please wait a minute and try again.",
      true,
    );
  }
  throw new TranscriptionError(`Transcription failed: ${lastError}`);
}
