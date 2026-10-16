import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        khmer: ["'Noto Sans Khmer'", "'Khmer OS'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
