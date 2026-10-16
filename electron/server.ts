import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { shell } from "electron";
import { getFfmpegPath, getFfprobePath, getPythonPath } from "./tools";
import type { RenderPayload } from "./types";

interface MulterFiles {
  [fieldname: string]: Express.Multer.File[];
}

function sanitizeName(value: string): string {
  return value.replace(/[^a-z0-9_-]/gi, "");
}

function atempoChain(speed: number): string {
  const parts: number[] = [];
  let remaining = speed;
  while (remaining > 2) {
    parts.push(2);
    remaining /= 2;
  }
  while (remaining < 0.5) {
    parts.push(0.5);
    remaining /= 0.5;
  }
  parts.push(remaining);
  return parts.map((value) => `atempo=${value.toFixed(3)}`).join(",");
}

function resolveAudioFile(audioDir: string, file: string): string | null {
  const relative = file.split("?")[0].replace(/^.*\/api\/audio\//, "").replace(/^\/+/, "");
  const safe = path.basename(relative);
  const full = path.join(audioDir, safe);
  return fs.existsSync(full) ? full : null;
}

export function createServer(outDir: string): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  const ffmpegPath = getFfmpegPath();
  const ffprobePath = getFfprobePath();
  const pythonPath = getPythonPath();
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);

  const defaultAudioDir = path.join(os.tmpdir(), "dai-dubber-audio");
  fs.mkdirSync(defaultAudioDir, { recursive: true });

  const uploadsDir = path.join(os.tmpdir(), "dai-dubber-uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });

  // Materialise the python helper on disk (works both in dev and inside an asar).
  const pythonScriptPath = path.join(os.tmpdir(), "dai-dubber-tts.py");
  try {
    const bundled = path.join(__dirname, "..", "python", "tts.py");
    const source = fs.existsSync(bundled)
      ? fs.readFileSync(bundled, "utf8")
      : "import argparse, asyncio, edge_tts\nprint('tts helper missing')\n";
    fs.writeFileSync(pythonScriptPath, source, "utf8");
  } catch (error) {
    console.error("Failed to prepare TTS helper script:", error);
  }

  const upload = multer({
    dest: uploadsDir,
    limits: { fileSize: 1024 * 1024 * 1024 },
  });

  app.post("/api/open-folder", (req: Request, res: Response) => {
    const folderPath = String(req.body?.folderPath || "");
    if (!folderPath) {
      res.status(400).json({ success: false, error: "No folder path provided." });
      return;
    }
    void shell.openPath(folderPath);
    res.json({ success: true });
  });

  app.post("/api/generate-audio", (req: Request, res: Response) => {
    const { text, gender, tempPath, index } = req.body as {
      text?: string;
      gender?: string;
      tempPath?: string;
      index?: string;
    };

    if (!text) {
      res.status(400).json({ success: false, error: "Text is required." });
      return;
    }

    const voice = gender === "Male" ? "km-KH-PisethNeural" : "km-KH-SreymomNeural";
    const audioDir = tempPath && tempPath.trim() ? tempPath : defaultAudioDir;

    try {
      fs.mkdirSync(audioDir, { recursive: true });
    } catch (error) {
      console.error("Could not create audio temp dir:", error);
    }

    const fileName = `seg_${sanitizeName(String(index || Date.now()))}_${Date.now()}.mp3`;
    const outputPath = path.join(audioDir, fileName);

    const child = spawn(
      pythonPath,
      [pythonScriptPath, "--text", text, "--voice", voice, "--output", outputPath, "--rate", "+0%"],
      { windowsHide: true },
    );

    let stderr = "";
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      res.status(500).json({ success: false, error: error.message });
    });

    child.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        res.json({ success: true, url: `/api/audio/${fileName}?v=1` });
      } else {
        res.status(500).json({ success: false, error: stderr || `Edge TTS exited with code ${code}` });
      }
    });
  });

  app.get("/api/audio/:file", (req: Request, res: Response) => {
    const safe = path.basename(req.params.file);
    const candidates = [path.join(defaultAudioDir, safe)];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        res.sendFile(candidate);
        return;
      }
    }
    res.status(404).send("Not found");
  });

  app.post(
    "/api/render",
    upload.fields([
      { name: "videoFile", maxCount: 1 },
      { name: "bgmFile", maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
      const files = (req.files ?? {}) as MulterFiles;
      const video = files.videoFile?.[0];
      const bgmFile = files.bgmFile?.[0];

      if (!video) {
        res.status(400).json({ success: false, error: "No video file uploaded." });
        return;
      }

      let payload: RenderPayload;
      try {
        payload = JSON.parse(req.body.data) as RenderPayload;
      } catch {
        res.status(400).json({ success: false, error: "Invalid render payload." });
        return;
      }

      const audioDir = path.dirname(video.path);
      const exportDir = payload.exportPath && payload.exportPath.trim() ? payload.exportPath : os.tmpdir();
      try {
        fs.mkdirSync(exportDir, { recursive: true });
      } catch (error) {
        console.error("Could not create export dir:", error);
      }

      let outputName = (payload.outputFileName || "output.mp4").trim();
      if (!outputName.toLowerCase().endsWith(".mp4")) outputName += ".mp4";
      const outputPath = path.join(exportDir, outputName);

      const cleanup = () => {
        try {
          fs.unlinkSync(video.path);
        } catch {
          /* ignore */
        }
        if (bgmFile) {
          try {
            fs.unlinkSync(bgmFile.path);
          } catch {
            /* ignore */
          }
        }
      };

      const command = ffmpeg();
      command.input(video.path);

      const filters: string[] = [];
      const mixLabels: string[] = [];
      let inputIndex = 1;

      for (const track of payload.audioTracks || []) {
        const filePath = resolveAudioFile(audioDir, track.file) ?? resolveAudioFile(defaultAudioDir, track.file);
        if (!filePath) continue;
        command.input(filePath);
        const idx = inputIndex++;
        const speed = Math.max(0.5, Math.min(2.5, track.speed || 1));
        const delay = Math.max(0, Math.round((track.start || 0) * 1000));
        filters.push(`[${idx}:a]${atempoChain(speed)},adelay=${delay}:all=1[a${idx}]`);
        mixLabels.push(`[a${idx}]`);
      }

      if (bgmFile && payload.bgmTrack && !payload.bgmTrack.isMuted) {
        command.input(bgmFile.path);
        const idx = inputIndex++;
        const delay = Math.max(0, Math.round((payload.bgmTrack.start || 0) * 1000));
        const volume = Math.max(0, Math.min(2, payload.bgmTrack.volume ?? 0.5));
        filters.push(`[${idx}:a]volume=${volume.toFixed(2)},adelay=${delay}:all=1[bgm]`);
        mixLabels.push("[bgm]");
      }

      const hasOriginalAudio = await new Promise<boolean>((resolve) => {
        ffmpeg.ffprobe(video.path, (error, metadata) => {
          if (error) {
            resolve(false);
            return;
          }
          resolve((metadata.streams || []).some((stream) => stream.codec_type === "audio"));
        });
      });

      if (!payload.isOriginalAudioMuted && hasOriginalAudio) {
        filters.push("[0:a]anull[orig]");
        mixLabels.unshift("[orig]");
      }

      let finalLabel = "";
      if (mixLabels.length === 0) {
        finalLabel = "";
      } else if (mixLabels.length === 1) {
        finalLabel = mixLabels[0].slice(1, -1);
      } else {
        filters.push(`${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=longest:normalize=0[aout]`);
        finalLabel = "aout";
      }

      if (filters.length > 0) {
        command.complexFilter(filters);
      }

      const outputOptions = ["-map", "0:v:0"];
      if (finalLabel) {
        outputOptions.push("-map", `[${finalLabel}]`, "-c:a", "aac", "-b:a", "192k");
      } else {
        outputOptions.push("-an");
      }
      outputOptions.push("-c:v", "copy", "-y");

      command
        .outputOptions(outputOptions)
        .on("start", (commandLine) => console.log("FFmpeg:", commandLine))
        .on("error", (error) => {
          console.error("Render error:", error.message);
          cleanup();
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: error.message });
          }
        })
        .on("end", () => {
          cleanup();
          res.json({
            success: true,
            downloadUrl: `/api/download?file=${encodeURIComponent(outputPath)}`,
          });
        })
        .save(outputPath);
    },
  );

  app.get("/api/download", (req: Request, res: Response) => {
    const file = String(req.query.file || "");
    if (!file || !fs.existsSync(file)) {
      res.status(404).send("Not found");
      return;
    }
    res.download(file);
  });

  app.use(express.static(outDir));

  return app;
}
