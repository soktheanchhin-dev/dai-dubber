"""Edge-TTS helper used by the Dai Dubber Electron backend.

Usage:
    python tts.py --text "..." --voice km-KH-SreymomNeural --output out.mp3 [--rate +0%]
"""

import argparse
import asyncio

import edge_tts


async def synthesize(text: str, voice: str, output: str, rate: str) -> None:
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(output)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate speech with Edge TTS")
    parser.add_argument("--text", required=True)
    parser.add_argument("--voice", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--rate", default="+0%")
    args = parser.parse_args()

    asyncio.run(synthesize(args.text, args.voice, args.output, args.rate))


if __name__ == "__main__":
    main()
