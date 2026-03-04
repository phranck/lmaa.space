import { defineConfig, presetTypography, presetWind4, transformerDirectives } from "unocss";

export default defineConfig({
  presets: [
    presetWind4({ dark: "class" }),
    presetTypography({
      cssExtend: {
        h1: {
          "margin-top": "0",
          "margin-bottom": "0.6em",
          "font-weight": "600",
        },
        h2: {
          "margin-top": "1.8em",
          "margin-bottom": "0.4em",
          "font-weight": "500",
        },
        h3: {
          "margin-top": "1.4em",
          "margin-bottom": "0.3em",
          "font-weight": "600",
        },
        h4: {
          "margin-top": "1.2em",
          "margin-bottom": "0.2em",
          "font-weight": "600",
        },
        p: {
          "margin-top": "1.25em",
          "margin-bottom": "1.25em",
        },
        li: {
          "margin-top": "0.25em",
          "margin-bottom": "0.25em",
        },
      },
    }),
  ],
  transformers: [transformerDirectives()],
  theme: {
    radius: {
      control: "0.5rem",
      card: "1.25rem",
    },
    font: {
      sans: '"Barlow", system-ui, -apple-system, sans-serif',
      serif: '"Barlow Condensed", system-ui, sans-serif',
    },
    fontSize: {
      xs: ["var(--ds-text-xs)", { lineHeight: "var(--ds-leading-xs)" }],
      sm: ["var(--ds-text-sm)", { lineHeight: "var(--ds-leading-sm)" }],
      base: ["var(--ds-text-base)", { lineHeight: "var(--ds-leading-base)" }],
      lg: ["var(--ds-text-lg)", { lineHeight: "var(--ds-leading-lg)" }],
      xl: ["var(--ds-text-xl)", { lineHeight: "var(--ds-leading-xl)" }],
      "2xl": ["var(--ds-text-2xl)", { lineHeight: "var(--ds-leading-2xl)" }],
      "3xl": ["var(--ds-text-3xl)", { lineHeight: "var(--ds-leading-3xl)" }],
      "4xl": ["var(--ds-text-4xl)", { lineHeight: "var(--ds-leading-4xl)" }],
    },
  },
  content: {
    filesystem: ["./src/**/*.{astro,ts,tsx,html}", "../../packages/ui/src/**/*.{ts,tsx}"],
    pipeline: {
      include: ["./src/**/*.{astro,ts,tsx,html}", "../../packages/ui/src/**/*.{ts,tsx}"],
    },
  },
});
