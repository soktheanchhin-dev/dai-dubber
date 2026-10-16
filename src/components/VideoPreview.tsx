"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, Volume2, VolumeX, Captions, CaptionsOff, Film } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { secondsToClock, parseTimeToSeconds } from "@/lib/time";
import { mediaUrl } from "@/lib/api";

export default function VideoPreview() {
  const {
    videoUrl,
    videoFile,
    videoDuration,
    setVideoDuration,
    activeSegment,
    showSubtitles,
    toggleShowSubtitles,
    isOriginalAudioMuted,
    segments,
    setSegments,
  } = useApp();

  const videoRef = useRef<HTMLVideoElement>(null);
  const lastActiveId = useRef<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = isOriginalAudioMuted;
  }, [isOriginalAudioMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    if (volume === 0) video.muted = true;
    else if (!isOriginalAudioMuted) video.muted = false;

    if (currentAudioRef.current) {
      currentAudioRef.current.volume = volume;
    }
  }, [volume, isOriginalAudioMuted]);

  const stopCurrentAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    }
  };

  const restart = () => {
    stopCurrentAudio();
    const video = videoRef.current;
    if (video) video.currentTime = 0;
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    const active = segments.find(
      (segment) =>
        video.currentTime >= parseTimeToSeconds(segment.textStart) &&
        video.currentTime <= parseTimeToSeconds(segment.textEnd),
    );
    const activeId = active?.id ?? null;
    if (activeId !== lastActiveId.current) {
      lastActiveId.current = activeId;
      stopCurrentAudio();

      if (active && active.audioUrl && !video.paused) {
        const audio = new Audio(mediaUrl(active.audioUrl));
        audio.playbackRate = active.speed || 1;
        const segmentOffset = Math.max(0, video.currentTime - parseTimeToSeconds(active.textStart));
        if (segmentOffset > 0) {
          audio.currentTime = segmentOffset;
        }
        audio.volume = volume;
        void audio.play().catch(() => {});
        currentAudioRef.current = audio;
      }

      setSegments((prev) =>
        prev.map((segment) => ({
          ...segment,
          status: segment.id === activeId ? "active" : segment.status === "active" ? "pending" : segment.status,
        })),
      );
    }
  };

  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    stopCurrentAudio();
    const video = videoRef.current;
    if (!video || videoDuration === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    video.currentTime = ratio * videoDuration;
  };

  const title = videoFile ? (videoFile.name.length > 30 ? `${videoFile.name.substring(0, 30)}...` : videoFile.name) : "Video Preview";

  return (
    <div className="p-4 flex flex-col gap-3 shrink-0">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-[var(--text-bright)] flex items-center gap-2">
          <Film size={16} className="text-[var(--accent-text)]" />
          {title}
        </h2>
      </div>

      <div className="relative aspect-[4/5] bg-black rounded-xl overflow-hidden border border-[var(--border-color)] shadow-lg flex items-center justify-center group">
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              loop
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={(event) => setVideoDuration(event.currentTarget.duration)}
              onEnded={() => {
                stopCurrentAudio();
                setIsPlaying(false);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => {
                stopCurrentAudio();
                setIsPlaying(false);
              }}
              onClick={togglePlay}
            />
            {showSubtitles && activeSegment && (
              <div className="absolute bottom-10 left-0 right-0 text-center px-4 pointer-events-none">
                <p className="text-white text-xl font-khmer drop-shadow-md bg-black/60 inline-block px-3 py-1 rounded">
                  {activeSegment.text}
                </p>
              </div>
            )}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] pointer-events-none group-hover:bg-black/40 transition-all">
                <button
                  onClick={togglePlay}
                  className="pointer-events-auto p-4 bg-[var(--accent-primary)] bg-opacity-90 rounded-full text-white hover:brightness-110 hover:scale-105 transition-all shadow-xl"
                >
                  <Play size={32} className="ml-1" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center text-slate-500 gap-2">
            <Film size={48} className="opacity-20" />
            <p className="text-sm">No video loaded</p>
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-base)] p-3 rounded-xl border border-[var(--border-color)] shadow-inner flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs font-mono text-[var(--text-secondary)]">
          <span className="text-[var(--accent-text)] font-medium">{secondsToClock(currentTime)}</span>
          <span>{secondsToClock(videoDuration)}</span>
        </div>
        <div
          className="w-full h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden cursor-pointer"
          onClick={seek}
        >
          <div
            className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-75"
            style={{ width: videoDuration > 0 ? `${(currentTime / videoDuration) * 100}%` : "0%" }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex gap-2">
            <button
              onClick={togglePlay}
              disabled={!videoUrl}
              className="p-2 rounded-lg bg-[var(--bg-hover)] hover:brightness-110 text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={restart}
              disabled={!videoUrl}
              className="p-2 rounded-lg bg-[var(--bg-hover)] hover:brightness-110 text-red-500 transition-colors disabled:opacity-50"
            >
              <SkipBack size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleShowSubtitles}
              disabled={!videoUrl}
              className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                showSubtitles
                  ? "text-[var(--accent-text)] hover:bg-[var(--bg-hover)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
              }`}
              title="Toggle Khmer Subtitles"
            >
              {showSubtitles ? <Captions size={18} /> : <CaptionsOff size={18} />}
            </button>
            <div className="flex items-center gap-2 group ml-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isOriginalAudioMuted ? 0 : volume}
                onChange={(event) => setVolume(parseFloat(event.target.value))}
                className="w-16 h-1 bg-[var(--border-light)] rounded-lg appearance-none cursor-pointer opacity-50 group-hover:opacity-100 transition-opacity"
              />
              <button
                onClick={() => setVolume((prev) => (prev === 0 ? 1 : 0))}
                disabled={!videoUrl}
                className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors disabled:opacity-50"
              >
                {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
