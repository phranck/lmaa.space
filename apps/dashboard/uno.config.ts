import { defineConfig, presetTypography, presetWind4, transformerDirectives } from "unocss";

export default defineConfig({
  presets: [presetWind4({ dark: "class" }), presetTypography()],
  transformers: [transformerDirectives()],
  theme: {
    radius: {
      control: "0.5rem",
      card: "1.25rem",
    },
    font: {
      sans: '"Inter", system-ui, -apple-system, sans-serif',
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
    pipeline: {
      include: ["./src/**/*.{ts,tsx,html}", "../../packages/ui/src/**/*.{ts,tsx}"],
    },
  },
});
