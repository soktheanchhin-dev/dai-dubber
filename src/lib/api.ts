import type { GenerateAudioRequest, GenerateAudioResponse, RenderResponse } from "./types";

export const API_BASE = "http://localhost:3001";

export function mediaUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${API_BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export async function generateAudio(
  request: GenerateAudioRequest,
): Promise<GenerateAudioResponse> {
  const response = await fetch(`${API_BASE}/api/generate-audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    return { success: false, error: `Server responded with ${response.status}` };
  }
  return (await response.json()) as GenerateAudioResponse;
}

export async function openFolder(folderPath: string): Promise<void> {
  await fetch(`${API_BASE}/api/open-folder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderPath }),
  });
}

export async function renderVideo(formData: FormData): Promise<RenderResponse> {
  const response = await fetch(`${API_BASE}/api/render`, {
    method: "POST",
    body: formData,
  });

  const text = await response.text();
  if (!response.ok) {
    try {
      const parsed = JSON.parse(text) as { error?: string };
      return { success: false, error: parsed.error || "Render failed on server" };
    } catch {
      return { success: false, error: "Server crashed or returned an invalid response." };
    }
  }

  try {
    return JSON.parse(text) as RenderResponse;
  } catch {
    return { success: false, error: "Server returned an invalid response." };
  }
}

export async function fetchAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(mediaUrl(url));
    audio.addEventListener("loadedmetadata", () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0));
    audio.addEventListener("error", () => resolve(0));
  });
}
