import type { Gender, GeminiModelGroup } from "./types";

export const GEMINI_MODELS: GeminiModelGroup[] = [
  {
    label: "Gemini 3.5 / 3.8",
    options: [
      { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite (Recommended & Fast)" },
      { value: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
      { value: "gemini-flash-latest", label: "Gemini Flash Latest" },
    ],
  },
  {
    label: "Gemini 2.5",
    options: [
      { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
  },
  {
    label: "Gemini 2.0 / Legacy",
    options: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
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
