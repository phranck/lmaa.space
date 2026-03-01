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
  },
  content: {
    filesystem: ["./src/**/*.{astro,ts,tsx,html}", "../../packages/ui/src/**/*.{ts,tsx}"],
    pipeline: {
      include: ["./src/**/*.{astro,ts,tsx,html}", "../../packages/ui/src/**/*.{ts,tsx}"],
    },
  },
});
