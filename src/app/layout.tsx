import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dai Dubber FREE",
  description: "AI video dubbing for Khmer — transcribed with Gemini and voiced with Edge TTS.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
