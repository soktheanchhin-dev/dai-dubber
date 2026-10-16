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
