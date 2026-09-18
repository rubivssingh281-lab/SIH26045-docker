import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F4EC",
        ink: "#121D26",
        forest: "#123C32",
        emerald: "#176B5B",
        navy: "#172A46",
        gold: "#C58B2A",
        line: "#E4E7EB",
        mist: "#EDF4FF",
        blueSoft: "#E8F0FB"
      },
      fontFamily: {
        serif: ["var(--font-dm-serif)", "Georgia", "serif"],
        sans: ["var(--font-manrope)", "Arial", "sans-serif"]
      },
      boxShadow: {
        soft: "0 4px 20px rgba(23, 42, 70, 0.05)"
      },
      borderRadius: {
        card: "16px",
        control: "8px"
      }
    }
  },
  plugins: []
};

export default config;