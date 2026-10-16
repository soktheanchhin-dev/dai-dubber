import type { Gender, GeminiModelGroup } from "./types";

export const GEMINI_MODELS: GeminiModelGroup[] = [
  {
    label: "Gemini 2.0",
    options: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Recommended)" },
      { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
    ],
  },
  {
    label: "Gemini 1.5",
    options: [
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
  },
  {
    label: "Gemini 2.5",
    options: [
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Fastest)" },
    ],
  },
];

/**
 * Maps the UI voice profile to an Edge-TTS Khmer neural voice.
 * Mirrors the mapping used by the Electron backend (`electron/server.ts`).
 */
export function genderToVoice(gender: Gender): string {
  return gender === "Male" ? "km-KH-PisethNeural" : "km-KH-SreymomNeural";
}
