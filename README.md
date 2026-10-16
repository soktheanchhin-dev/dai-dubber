# Dai Dubber FREE (Khmer Edition) — TypeScript / Next.js / Electron Rebuild

A complete rebuild of the original Vite + Electron + Python application using:
- **Next.js 14** (App Router, static export)
- **TypeScript** (strict mode)
- **Tailwind CSS 3**
- **Electron 31** (with Express backend on port 3001)
- **edge-tts** (via bundled Python) for Khmer neural voices
- **FFmpeg** (via fluent-ffmpeg) for rendering

## Features
- Load video + background music (BGM)
- Transcribe & translate video to Khmer via **Google Gemini** (failover across multiple API keys)
- Edit subtitles in a spreadsheet-style table with inline Khmer text editing
- Voice profiles: **Male** (`km-KH-PisethNeural`) / **Female** (`km-KH-SreymomNeural`)
- Generate TTS audio via Edge-TTS (bundled Python)
- Timeline editor with draggable blocks (T1 text, A1 audio, A2 BGM)
- Speed control & retiming
- Export / Import SRT
- Final render with FFmpeg (mix TTS tracks, BGM, optional original audio)
- Dark / Light theme with full colour customisation
- Settings persisted to `localStorage`
- Toast notifications

---

## Prerequisites
- **Node.js ≥ 20** (tested on v24.13)
- **Python 3.11+** with `edge-tts` (`pip install edge-tts==7.3.1`)
- **FFmpeg** + **FFprobe** on PATH (or place in `tools/ffmpeg.exe`, `tools/ffprobe.exe`)

The original distribution already includes `tools/` with:
```
tools/
├── ffmpeg.exe
├── ffprobe.exe
└── python/ (full embedded Python 3.13 + edge-tts)
```
This rebuild **reuses that folder automatically** (looks for `../tools` relative to the project).

---

## Quick Start (Development)

```bash
cd dai-dubber
npm install          # once
npm run dev          # starts Next.js on :3000 + Electron with hot reload
```

`npm run dev` runs:
- `next dev -p 3000` (renderer)
- `tsc -p electron/tsconfig.json` (compile main process)
- `wait-on tcp:3000 && DAI_DEV=http://localhost:3000 electron .` (Electron loads the dev server)

The backend API always runs on **http://localhost:3001** (Express inside Electron main).

---

## Production Build

```bash
npm run build        # next build + electron tsc
npm start            # run packaged-style (serves out/ via Express on :3001)
```

---

## Distributable (Windows Portable / NSIS)

```bash
npm run dist
```

Output appears in `release/`. The `extraResources` config copies the sibling `tools/` folder into the package so ffmpeg / python are available at runtime.

---

## Project Structure
```
dai-dubber/
├── package.json
├── tsconfig.json                  # renderer (Next.js)
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── .gitignore
├── public/
│   ├── logo.png
│   └── icon.ico
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── VideoPreview.tsx
│   │   ├── WorkspaceTools.tsx
│   │   ├── SubtitleTable.tsx
│   │   ├── Timeline.tsx
│   │   ├── RenderModal.tsx
│   │   ├── SettingsModal.tsx
│   │   └── ToastContainer.tsx
│   ├── context/
│   │   └── AppContext.tsx         # global state (React context)
│   └── lib/
│       ├── types.ts
│       ├── time.ts
│       ├── srt.ts
│       ├── storage.ts
│       ├── voices.ts
│       ├── api.ts
│       └── gemini.ts
└── electron/
    ├── tsconfig.json              # main process (CommonJS)
    ├── main.ts                    # Electron entry (starts Express + window)
    ├── server.ts                  # Express API (generate-audio, render, open-folder)
    ├── tools.ts                   # ffmpeg / python path resolution
    ├── types.ts                   # shared payload types
    └── python/
        └── tts.py                 # edge-tts CLI wrapper
```

---

## Architecture Notes
- **Renderer** is a **static Next.js export** (`out/`). In production Electron loads `http://localhost:3001` which serves `out/` + the API.
- **Main process** starts an Express server on **127.0.0.1:3001** with CORS enabled.
- **IPC** is HTTP-based (same as original) — keeps the renderer decoupled and simple.
- **TTS** spawns `python -m edge_tts` via the bundled Python. Voice mapping:
  - Male → `km-KH-PisethNeural`
  - Female → `km-KH-SreymomNeural`
- **Render** uses `fluent-ffmpeg` with a dynamic `filter_complex`:
  - Each TTS track → `atempo=speed,adelay=startMs`
  - BGM → `volume=vol,adelay=startMs`
  - Original audio (if not muted) → `anull`
  - Mixed with `amix=normalize=0` then mapped with video (`-c:v copy -c:a aac`).
- **Tools resolution** (`electron/tools.ts`) searches:
  1. `DAI_TOOLS_DIR` env
  2. `process.resourcesPath/tools` (packaged extraResources)
  3. `<app>/tools`
  4. `<app>/../tools` (workspace layout)
  5. `<cwd>/tools`

---

## Settings (persisted to localStorage)
| Key | Description |
|-----|-------------|
| `aiDubberApiKeys` | Array of Gemini API keys (failover order) |
| `aiDubberModel`   | Selected Gemini model (default `gemini-2.0-flash`; app will retry supported Gemini models if the chosen one is unavailable) |
| `aiDubberTempPath` | Folder for generated TTS audio (default `C:\Temp\AIDubber`) |
| `aiDubberExportPath` | Output folder for rendered video (default `C:\Export\AIDubber`) |
| `aiDubberThemeDark` / `aiDubberThemeLight` | Custom colour palettes |
| `aiDubberMode` | `dark` or `light` |

---

## Gemini Prompt (transcription)
The exact prompt used (from the original app) is embedded in `src/lib/gemini.ts`. It asks for a **JSON array** with fields `start`, `end`, `text` (Khmer), `emotion`, `voice`, `gender` and strict `HH:MM:SS.sss` timestamps.

---

## Troubleshooting
- **"Could not connect to backend render engine"** → Express on :3001 failed to start. Check console for `Backend server error:`.
- **TTS fails** → Ensure `edge-tts` is installed in the bundled Python (`tools/python -m edge_tts --version`).
- **FFmpeg not found** → Put `ffmpeg.exe` / `ffprobe.exe` in `tools/` next to the project or set `DAI_TOOLS_DIR`.
- **Video has no audio track** → Original audio checkbox will have no effect; the render will proceed with TTS + BGM only.

---

## License
MIT — rebuilt for educational / personal use. Original "Dai Dubber FREE" branding and assets belong to **DaCoding**.