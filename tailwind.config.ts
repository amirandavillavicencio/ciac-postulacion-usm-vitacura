import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ciac: {
          navy: "#0F2747",
          blue: "#1E4E8C",
          light: "#EAF2FB",
          gold: "#F2B94B"
        }
      }
    }
  },
  plugins: []
};

export default config;
