import { defineConfig, presetTypography, presetWind4, transformerDirectives } from "unocss";

export default defineConfig({
  presets: [
    presetWind4({ dark: "class" }),
    presetTypography({
      cssExtend: {
        h2: { "font-weight": "500", "margin-bottom": "0.3em" },
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
