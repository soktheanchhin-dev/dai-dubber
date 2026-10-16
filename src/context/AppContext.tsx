"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppSettings,
  BgmTrack,
  Gender,
  RenderBgm,
  RenderPayload,
  SubtitleSegment,
  ThemeColors,
  ToastMessage,
  ToastType,
} from "@/lib/types";
import {
  DEFAULT_EXPORT_PATH,
  DEFAULT_TEMP_PATH,
  DEFAULT_THEME_DARK,
  DEFAULT_THEME_LIGHT,
  loadSettings,
  loadTheme,
  resetTheme as persistResetTheme,
  saveApiKeys,
  saveExportPath,
  saveModel,
  saveTempPath,
  saveTheme,
  saveThemeMode,
} from "@/lib/storage";
import { fetchAudioDuration, generateAudio, mediaUrl, openFolder, renderVideo } from "@/lib/api";
import { transcribeVideo, TranscriptionCancelled } from "@/lib/gemini";
import { parseTimeToSeconds, clampSeconds } from "@/lib/time";
import { buildSrt, parseSrt } from "@/lib/srt";

export interface RenderState {
  isOpen: boolean;
  title: string;
  progress: number;
  isRendering: boolean;
  success: boolean;
  error: string | null;
  downloadUrl: string | null;
}

interface AppContextValue {
  // theme
  isDark: boolean;
  theme: ThemeColors;
  toggleMode: () => void;
  updateThemeColor: (key: keyof ThemeColors, value: string) => void;
  resetTheme: () => void;

  // settings
  settings: AppSettings;
  exportPath: string;
  setModel: (model: string) => void;
  setTempPath: (path: string) => void;
  setExportPath: (path: string) => void;
  addApiKey: (key: string) => void;
  removeApiKey: (key: string) => void;

  // media
  videoFile: File | null;
  videoUrl: string | null
  videoDuration: number;
  setVideoDuration: (duration: number) => void;
  loadVideo: (file: File) => void;
  bgm: BgmTrack;
  loadBgm: (file: File) => void;
  removeBgm: () => void;
  updateBgm: (patch: Partial<BgmTrack>) => void;
  isOriginalAudioMuted: boolean;
  toggleOriginalAudio: () => void;
  showSubtitles: boolean;
  toggleShowSubtitles: () => void;
  clearAll: () => void;

  // subtitles
  segments: SubtitleSegment[];
  setSegments: (updater: SubtitleSegment[] | ((prev: SubtitleSegment[]) => SubtitleSegment[])) => void;
  activeSegment: SubtitleSegment | undefined;
  history: SubtitleSegment[][];
  restoreSnapshot: (snapshot: SubtitleSegment[]) => void;
  updateSegment: (id: string, patch: Partial<SubtitleSegment>) => void;
  setAllVoices: (gender: Gender) => void;
  importSrt: (file: File) => Promise<void>;
  exportSrt: () => Promise<void>;

  // selection
  selection: string[];
  setSelection: (updater: string[] | ((prev: string[]) => string[])) => void;

  // transcription
  isTranscribing: boolean;
  startTranscription: () => Promise<void>;
  cancelTranscription: () => void;

  // audio generation
  isGeneratingAudio: boolean;
  generateSelectedAudio: () => Promise<void>;
  stopAudioGeneration: () => void;
  playSegment: (segment: SubtitleSegment) => void;

  // render
  render: RenderState;
  openRenderModal: () => void;
  closeRenderModal: () => void;
  setRenderTitle: (title: string) => void;
  startRender: () => Promise<void>;
  revealExportFolder: () => Promise<void>;

  // ui
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  pushToast: (message: string, type?: ToastType) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const DEFAULT_BGM: BgmTrack = {
  src: null,
  file: null,
  name: "",
  start: 0,
  duration: 0,
  volume: 0.5,
  isMuted: false,
  fadeIn: 0,
  fadeOut: 0,
};

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().substring(0, 8);
  }
  return Math.random().toString(36).substring(2, 10);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initialTheme = useMemo(() => loadTheme(), []);
  const [isDark, setIsDark] = useState(initialTheme.isDark);
  const [darkTheme, setDarkTheme] = useState<ThemeColors>(initialTheme.dark);
  const [lightTheme, setLightTheme] = useState<ThemeColors>(initialTheme.light);
  const theme = isDark ? darkTheme : lightTheme;

  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [exportPath, setExportPathState] = useState<string>(DEFAULT_EXPORT_PATH);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);

  const [bgm, setBgm] = useState<BgmTrack>(DEFAULT_BGM);
  const [isOriginalAudioMuted, setIsOriginalAudioMuted] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);

  const [segments, setSegmentsState] = useState<SubtitleSegment[]>([]);
  const [history, setHistory] = useState<SubtitleSegment[][]>([]);
  const [selection, setSelectionState] = useState<string[]>([]);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [render, setRender] = useState<RenderState>({
    isOpen: false,
    title: "",
    progress: 0,
    isRendering: false,
    success: false,
    error: null,
    downloadUrl: null,
  });

  const transcribeController = useRef<AbortController | null>(null);
  const stopFlag = useRef(false);
  const audioCache = useRef<Record<string, HTMLAudioElement>>({});
  const toastTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setExportPathState(loadSettings().exportPath);
  }, []);

  const pushToast = useCallback((message: string, type: ToastType = "error") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, type }]);
    toastTimers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      delete toastTimers.current[id];
    }, 3500);
  }, []);

  // ------------------------------------------------------------------ theme
  const toggleMode = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      saveThemeMode(next);
      return next;
    });
  }, []);

  const updateThemeColor = useCallback(
    (key: keyof ThemeColors, value: string) => {
      if (isDark) {
        setDarkTheme((prev) => {
          const next = { ...prev, [key]: value };
          saveTheme(true, next);
          return next;
        });
      } else {
        setLightTheme((prev) => {
          const next = { ...prev, [key]: value };
          saveTheme(false, next);
          return next;
        });
      }
    },
    [isDark],
  );

  const resetTheme = useCallback(() => {
    persistResetTheme(isDark);
    if (isDark) setDarkTheme(DEFAULT_THEME_DARK);
    else setLightTheme(DEFAULT_THEME_LIGHT);
  }, [isDark]);

  // ---------------------------------------------------------------- settings
  const setModel = useCallback((model: string) => {
    saveModel(model);
    setSettings((prev) => ({ ...prev, model }));
  }, []);

  const setTempPath = useCallback((path: string) => {
    saveTempPath(path);
    setSettings((prev) => ({ ...prev, tempPath: path }));
  }, []);

  const setExportPath = useCallback((path: string) => {
    saveExportPath(path);
    setExportPathState(path);
    setSettings((prev) => ({ ...prev, exportPath: path }));
  }, []);

  const addApiKey = useCallback(
    (key: string) => {
      const trimmed = key.trim();
      if (!trimmed) return;
      setSettings((prev) => {
        if (prev.apiKeys.includes(trimmed)) return prev;
        const apiKeys = [...prev.apiKeys, trimmed];
        saveApiKeys(apiKeys);
        return { ...prev, apiKeys };
      });
    },
    [],
  );

  const removeApiKey = useCallback((key: string) => {
    setSettings((prev) => {
      const apiKeys = prev.apiKeys.filter((item) => item !== key);
      saveApiKeys(apiKeys);
      return { ...prev, apiKeys };
    });
  }, []);

  // -------------------------------------------------------------------- data
  const setSegments = useCallback(
    (updater: SubtitleSegment[] | ((prev: SubtitleSegment[]) => SubtitleSegment[])) => {
      setSegmentsState((prev) => (typeof updater === "function" ? updater(prev) : updater));
    },
    [],
  );

  const pushHistory = useCallback((snapshot: SubtitleSegment[]) => {
    setHistory((prev) => [...prev.slice(-49), snapshot.map((segment) => ({ ...segment }))]);
  }, []);

  const restoreSnapshot = useCallback((snapshot: SubtitleSegment[]) => {
    setSegmentsState(snapshot.map((segment) => ({ ...segment })));
  }, []);

  const updateSegment = useCallback((id: string, patch: Partial<SubtitleSegment>) => {
    setSegmentsState((prev) => prev.map((segment) => (segment.id === id ? { ...segment, ...patch } : segment)));
  }, []);

  const setAllVoices = useCallback((gender: Gender) => {
    setSegmentsState((prev) => prev.map((segment) => ({ ...segment, gender })));
  }, []);

  const setSelection = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
    setSelectionState((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  const activeSegment = useMemo(
    () => segments.find((segment) => segment.status === "active"),
    [segments],
  );

  // -------------------------------------------------------------- media load
  const loadVideo = useCallback(
    (file: File) => {
      setVideoFile(file);
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setVideoDuration(0);
    },
    [],
  );

  const loadBgm = useCallback((file: File) => {
    setBgm((prev) => {
      if (prev.src?.startsWith("blob:")) URL.revokeObjectURL(prev.src);
      return {
        src: URL.createObjectURL(file),
        file,
        name: file.name,
        start: 0,
        duration: 0,
        volume: 0.5,
        isMuted: false,
        fadeIn: 0,
        fadeOut: 0,
      };
    });
  }, []);

  const removeBgm = useCallback(() => {
    setBgm((prev) => {
      if (prev.src?.startsWith("blob:")) URL.revokeObjectURL(prev.src);
      return { ...DEFAULT_BGM };
    });
  }, []);

  const updateBgm = useCallback((patch: Partial<BgmTrack>) => {
    setBgm((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleOriginalAudio = useCallback(() => setIsOriginalAudioMuted((prev) => !prev), []);
  const toggleShowSubtitles = useCallback(() => setShowSubtitles((prev) => !prev), []);

  const clearAll = useCallback(() => {
    setSegmentsState([]);
    setSelectionState([]);
    setHistory([]);
    setVideoFile(null);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setVideoDuration(0);
    removeBgm();
    setIsOriginalAudioMuted(false);
  }, [removeBgm]);

  // --------------------------------------------------------------- srt i/o
  const importSrt = useCallback(
    async (file: File) => {
      const content = await file.text();
      const parsed = parseSrt(content);
      setSegmentsState((prev) => {
        pushHistory(prev);
        return parsed;
      });
      pushToast(`Imported ${parsed.length} subtitle lines.`, "success");
    },
    [pushHistory, pushToast],
  );

  const exportSrt = useCallback(async () => {
    if (segments.length === 0) {
      pushToast("No subtitles to export.", "warning");
      return;
    }
    const content = buildSrt(segments);
    const fileName = videoFile ? `${videoFile.name.replace(/\.[^/.]+$/, "")}.srt` : "project_subtitles.srt";

    const w = window as unknown as {
      showSaveFilePicker?: (options: unknown) => Promise<{ createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }> }>;
    };

    if (w.showSaveFilePicker) {
      try {
        const handle = await w.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: "SRT Subtitles File", accept: { "text/plain": [".srt"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return;
      } catch (error) {
        if ((error as DOMException).name === "AbortError") return;
      }
    }

    const blob = new Blob([content], { type: "text/srt;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [segments, videoFile, pushToast]);

  // -------------------------------------------------------------- transcribe
  const startTranscription = useCallback(async () => {
    if (!videoFile) {
      pushToast("Please upload a video first.", "error");
      return;
    }
    if (settings.apiKeys.length === 0) {
      pushToast("Please add at least one Gemini API Key in Settings.", "error");
      setSettingsOpen(true);
      return;
    }

    setIsTranscribing(true);
    const controller = new AbortController();
    transcribeController.current = controller;

    try {
      pushToast("Analyzing video with Gemini...", "info");
      const result = await transcribeVideo({
        videoFile,
        apiKeys: settings.apiKeys,
        model: settings.model,
        videoDuration,
        signal: controller.signal,
      });
      setSegmentsState((prev) => {
        pushHistory(prev);
        return result;
      });
      pushToast("Transcription complete.", "success");
    } catch (error) {
      if (error instanceof TranscriptionCancelled) {
        pushToast("Transcription cancelled.", "info");
      } else {
        pushToast(error instanceof Error ? error.message : "Transcription failed.", "error");
      }
    } finally {
      setIsTranscribing(false);
      transcribeController.current = null;
    }
  }, [videoFile, settings.apiKeys, settings.model, videoDuration, pushHistory, pushToast]);

  const cancelTranscription = useCallback(() => {
    transcribeController.current?.abort();
    setIsTranscribing(false);
  }, []);

  // ----------------------------------------------------------- audio gen
  const retimeSegments = useCallback((items: SubtitleSegment[], duration: number): SubtitleSegment[] => {
    const sorted = [...items].sort(
      (a, b) => parseTimeToSeconds(a.textStart) - parseTimeToSeconds(b.textStart),
    );
    const copy = items.map((segment) => ({ ...segment }));

    sorted.forEach((segment, index) => {
      if (segment.audioStatus !== "ready" || !segment.baseAudioDuration) return;
      const next = sorted[index + 1];
      const start = parseTimeToSeconds(segment.textStart);
      const available = next ? parseTimeToSeconds(next.textStart) - start : duration - start;
      const scaled = segment.baseAudioDuration / (segment.speed || 1);
      if (scaled > available && available > 0.1) {
        let speed = segment.baseAudioDuration / available;
        speed = Math.max(0.5, Math.min(2.5, speed));
        const target = copy.find((item) => item.id === segment.id);
        if (target) {
          let end = start + segment.baseAudioDuration / speed;
          if (duration > 0 && end > duration) end = duration;
          target.speed = speed;
          target.audioEnd = end.toFixed(2);
        }
      }
    });

    return copy;
  }, []);

  const generateSelectedAudio = useCallback(async () => {
    const selected = segments
      .map((segment, index) => ({ segment, index }))
      .filter(({ segment }) => selection.includes(`text-${segment.id}`) || selection.includes(`audio-${segment.id}`));

    if (selected.length === 0) {
      pushToast("Please select at least one subtitle block.", "warning");
      return;
    }

    setIsGeneratingAudio(true);
    stopFlag.current = false;

    const concurrency = 3;
    let fatal = false;

    const worker = async ({ segment, index }: { segment: SubtitleSegment; index: number }) => {
      setSegmentsState((prev) =>
        prev.map((item, i) => (i === index ? { ...item, audioStatus: "generating" } : item)),
      );

      try {
        const response = await generateAudio({
          text: segment.text,
          gender: segment.gender,
          tempPath: settings.tempPath,
          index: segment.id,
          speed: segment.speed,
        });

        if (!response.success || !response.url) {
          setSegmentsState((prev) =>
            prev.map((item, i) => (i === index ? { ...item, audioStatus: "idle" } : item)),
          );
          return { success: false, fatal: true, error: response.error || "Audio generation failed." };
        }

        const url = `${response.url}&t=${Date.now()}`;
        const duration = await fetchAudioDuration(url);

        if (audioCache.current[segment.id]) {
          audioCache.current[segment.id].pause();
          audioCache.current[segment.id].src = "";
          delete audioCache.current[segment.id];
        }

        setSegmentsState((prev) =>
          prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  audioStatus: "ready",
                  audioUrl: url,
                  baseAudioDuration: duration,
                  audioStart: item.textStart,
                  audioEnd: (parseTimeToSeconds(item.textStart) + duration / (item.speed || 1)).toFixed(2),
                }
              : item,
          ),
        );
        return { success: true, fatal: false };
      } catch (error) {
        setSegmentsState((prev) =>
          prev.map((item, i) => (i === index ? { ...item, audioStatus: "idle" } : item)),
        );
        return {
          success: false,
          fatal: true,
          error: error instanceof Error ? error.message : "Audio generation failed.",
        };
      }
    };

    for (let i = 0; i < selected.length; i += concurrency) {
      if (stopFlag.current || fatal) break;
      const batch = selected.slice(i, i + concurrency);
      const results = await Promise.all(batch.map((entry) => worker(entry)));
      const failed = results.find((result) => result.fatal);
      if (failed) {
        pushToast(failed.error || "Audio generation failed.", "error");
        fatal = true;
      }
    }

    setSegmentsState((prev) => retimeSegments(prev, videoDuration));
    setIsGeneratingAudio(false);
  }, [segments, selection, settings.tempPath, videoDuration, retimeSegments, pushToast]);

  const stopAudioGeneration = useCallback(() => {
    stopFlag.current = true;
    setIsGeneratingAudio(false);
  }, []);

  const playSegment = useCallback(
    (segment: SubtitleSegment) => {
      if (segment.audioUrl) {
        let audio = audioCache.current[segment.id];
        if (!audio) {
          audio = new Audio(mediaUrl(segment.audioUrl));
          audioCache.current[segment.id] = audio;
        }
        audio.playbackRate = segment.speed || 1;
        void audio.play();
        return;
      }

      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(segment.text);
      utterance.pitch = segment.gender === "Male" ? 0.8 : 1.2;
      utterance.rate = segment.speed || 1;
      window.speechSynthesis.speak(utterance);
    },
    [],
  );

  // ------------------------------------------------------------------ render
  const openRenderModal = useCallback(() => {
    if (!videoFile) {
      pushToast("Please load a video first to render.", "error");
      return;
    }
    setRender({
      isOpen: true,
      title: `${videoFile.name.replace(/\.[^/.]+$/, "")}.mp4`,
      progress: 0,
      isRendering: false,
      success: false,
      error: null,
      downloadUrl: null,
    });
  }, [videoFile, pushToast]);

  const closeRenderModal = useCallback(() => {
    setRender((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const setRenderTitle = useCallback((title: string) => {
    setRender((prev) => ({ ...prev, title }));
  }, []);

  const startRender = useCallback(async () => {
    if (!videoFile) return;

    setRender((prev) => ({ ...prev, isRendering: true, progress: 0, error: null }));

    const bgmTrack: RenderBgm | null = bgm.src
      ? { name: bgm.name, start: bgm.start, volume: bgm.volume, isMuted: bgm.isMuted }
      : null;

    const payload: RenderPayload = {
      audioTracks: segments
        .filter((segment) => segment.audioStatus === "ready" && segment.audioUrl)
        .map((segment) => ({
          file: segment.audioUrl!.split("&t=")[0],
          start: parseFloat(segment.audioStart),
          speed: segment.speed || 1,
          duration: segment.baseAudioDuration
            ? segment.baseAudioDuration / (segment.speed || 1)
            : parseTimeToSeconds(segment.audioEnd) - parseTimeToSeconds(segment.audioStart),
        })),
      bgmTrack,
      isOriginalAudioMuted,
      outputFileName: render.title,
      exportPath,
    };

    const formData = new FormData();
    formData.append("videoFile", videoFile);
    formData.append("data", JSON.stringify(payload));
    if (bgm.file) formData.append("bgmFile", bgm.file);

    let progress = 0;
    const timer = setInterval(() => {
      progress += (100 - progress) * 0.1;
      setRender((prev) => ({ ...prev, progress: Math.min(90, Math.floor(progress)) }));
    }, 500);

    try {
      const result = await renderVideo(formData);
      clearInterval(timer);
      if (!result.success) {
        setRender((prev) => ({
          ...prev,
          isRendering: false,
          error: result.error || "Render failed.",
        }));
        return;
      }
      setRender((prev) => ({
        ...prev,
        isRendering: false,
        progress: 100,
        success: true,
        downloadUrl: result.downloadUrl ?? null,
      }));
    } catch (error) {
      clearInterval(timer);
      setRender((prev) => ({
        ...prev,
        isRendering: false,
        error: error instanceof Error ? error.message : "Failed to connect to the render engine.",
      }));
    }
  }, [videoFile, bgm, segments, isOriginalAudioMuted, render.title, exportPath]);

  const revealExportFolder = useCallback(async () => {
    try {
      await openFolder(exportPath || DEFAULT_EXPORT_PATH);
    } catch {
      pushToast(`Could not open folder: ${exportPath}`, "error");
    }
  }, [exportPath, pushToast]);

  const value: AppContextValue = {
    isDark,
    theme,
    toggleMode,
    updateThemeColor,
    resetTheme,
    settings,
    exportPath,
    setModel,
    setTempPath,
    setExportPath,
    addApiKey,
    removeApiKey,
    videoFile,
    videoUrl,
    videoDuration,
    setVideoDuration,
    loadVideo,
    bgm,
    loadBgm,
    removeBgm,
    updateBgm,
    isOriginalAudioMuted,
    toggleOriginalAudio,
    showSubtitles,
    toggleShowSubtitles,
    clearAll,
    segments,
    setSegments,
    activeSegment,
    history,
    restoreSnapshot,
    updateSegment,
    setAllVoices,
    importSrt,
    exportSrt,
    selection,
    setSelection,
    isTranscribing,
    startTranscription,
    cancelTranscription,
    isGeneratingAudio,
    generateSelectedAudio,
    stopAudioGeneration,
    playSegment,
    render,
    openRenderModal,
    closeRenderModal,
    setRenderTitle,
    startRender,
    revealExportFolder,
    settingsOpen,
    setSettingsOpen,
    toasts,
    pushToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
}
