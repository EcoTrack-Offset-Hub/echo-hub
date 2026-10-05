import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          foreground: "var(--primary-foreground)",
          light: "var(--primary-light)",
          border: "var(--primary-border)",
        },
        background: "var(--background)",
        surface: "var(--surface)",
        foreground: {
          DEFAULT: "var(--foreground)",
          heading: "var(--foreground-heading)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          light: "var(--muted-light)",
          foreground: "var(--muted-foreground)",
        },
        border: {
          DEFAULT: "var(--border)",
          light: "var(--border-light)",
        },
        success: {
          DEFAULT: "var(--success)",
          bg: "var(--success-bg)",
          border: "var(--success-border)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          bg: "var(--warning-bg)",
          border: "var(--warning-border)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          bg: "var(--danger-bg)",
          border: "var(--danger-border)",
        },
        info: {
          DEFAULT: "var(--info)",
          bg: "var(--info-bg)",
          border: "var(--info-border)",
        },
        scope1: "var(--scope-1)",
        scope2: "var(--scope-2)",
        scope3: "var(--scope-3)",
      },
    },
  },
  plugins: [],
};

export default config;
