import { defineConfig, presetTypography, presetWind4, transformerDirectives } from "unocss";

export default defineConfig({
  presets: [
    presetWind4({ dark: "class" }),
    presetTypography(),
  ],
  transformers: [transformerDirectives()],
  theme: {
    radius: {
      control: "var(--radius-control)",
      card: "var(--radius-card)",
    },
    font: {
      sans: '"Barlow", system-ui, -apple-system, sans-serif',
      serif: '"Barlow Condensed", system-ui, sans-serif',
    },
  },
  content: {
    pipeline: {
      include: [
        "./src/**/*.{ts,tsx,html}",
        "../../packages/ui/src/**/*.{ts,tsx}",
      ],
    },
  },
});
