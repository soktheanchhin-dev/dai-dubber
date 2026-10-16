export type Gender = "Male" | "Female";
export type SegmentStatus = "pending" | "active";
export type AudioStatus = "idle" | "generating" | "ready";

export interface SubtitleSegment {
  id: string;
  textStart: string;
  textEnd: string;
  audioStart: string;
  audioEnd: string;
  text: string;
  voice: string;
  gender: Gender;
  status: SegmentStatus;
  audioStatus: AudioStatus;
  audioUrl: string | null;
  baseAudioDuration: number;
  speed: number;
}

export interface BgmTrack {
  src: string | null;
  file: File | null;
  name: string;
  start: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  fadeIn: number;
  fadeOut: number;
}

export interface ThemeColors {
  bgBase: string;
  bgPanel: string;
  accentPrimary: string;
  textPrimary: string;
}

export interface AppSettings {
  model: string;
  tempPath: string;
  exportPath: string;
  apiKeys: string[];
}

export interface RenderAudioTrack {
  file: string;
  start: number;
  speed: number;
  duration: number;
}

export interface RenderBgm {
  name: string;
  start: number;
  volume: number;
  isMuted: boolean;
}

export interface RenderPayload {
  audioTracks: RenderAudioTrack[];
  bgmTrack: RenderBgm | null;
  isOriginalAudioMuted: boolean;
  outputFileName: string;
  exportPath: string;
}

export interface GenerateAudioRequest {
  text: string;
  gender: Gender;
  tempPath: string;
  index: string;
  speed: number;
}

export interface GenerateAudioResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export interface RenderResponse {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

export interface GeminiModelGroup {
  label: string;
  options: { value: string; label: string }[];
}
