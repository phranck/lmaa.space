import { defineConfig, presetTypography, presetWind4, transformerDirectives } from "unocss";

export default defineConfig({
  presets: [
    presetWind4({ dark: "class" }),
    presetTypography(),
  ],
  transformers: [transformerDirectives()],
  theme: {
    radius: {
      control: "0.5rem",
      card: "1.25rem",
    },
    font: {
      sans: '"Inter", system-ui, -apple-system, sans-serif',
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
