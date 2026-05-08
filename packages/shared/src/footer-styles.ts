// Type kept in sync with @lmaa/contracts/src/footer-config.ts to avoid circular dependency.
type FooterStyle = {
  bgColor: string;
  textColor: string;
  headlineColor: string;
  linkColor: string;
  linkHoverColor: string;
  buttonColor: string;
  buttonTextColor: string;
  height: "sm" | "md" | "lg" | "xl";
  paddingY: "sm" | "md" | "lg" | "xl";
};

const FOOTER_HEIGHTS_PX: Record<FooterStyle["height"], number> = {
  sm: 240,
  md: 320,
  lg: 420,
  xl: 560,
};

const FOOTER_PADDING_Y: Record<FooterStyle["paddingY"], string> = {
  sm: "2rem",
  md: "2.75rem",
  lg: "3.5rem",
  xl: "5rem",
};

const FOOTER_PADDING_Y_PX: Record<FooterStyle["paddingY"], number> = {
  sm: 36,
  md: 50,
  lg: 63,
  xl: 90,
};

const FOOTER_STYLE_DEFAULTS = {
  bgColor: "#1c1917",
  textColor: "#d6d3d1",
  headlineColor: "#78716c",
  linkColor: "#a8a29e",
  linkHoverColor: "#fbbf24",
  buttonColor: "#7c3aed",
  buttonTextColor: "#ffffff",
  height: "md" as const,
  paddingY: "lg" as const,
} satisfies FooterStyle;

/**
 * Calculates the total footer height in pixels for a given style configuration.
 *
 * Accounts for both the base height tier and padding adjustments relative to
 * the default padding size.
 *
 * @param style - Partial footer style overrides; falls back to defaults.
 * @returns CSS pixel string, e.g. `"320px"`.
 */
export function resolveFooterHeightPx(style?: Partial<FooterStyle>): string {
  const s = { ...FOOTER_STYLE_DEFAULTS, ...style };
  const baseHeight = FOOTER_HEIGHTS_PX[s.height];
  const defaultPadding = FOOTER_PADDING_Y_PX[FOOTER_STYLE_DEFAULTS.paddingY];
  const nextPadding = FOOTER_PADDING_Y_PX[s.paddingY];
  const totalHeight = baseHeight + (nextPadding - defaultPadding) * 2;
  return `${totalHeight}px`;
}

/**
 * Shared CSS for the website footer.
 *
 * Uses CSS custom properties so colors and padding can be overridden at
 * runtime by setting them on the `.footer-root` element via `footerStyleVars`.
 *
 * Used by:
 * - `apps/frontend` Footer.astro  (injected as a <style> block)
 */
export const FOOTER_STYLES_CSS = `
.footer-root {
  margin-top: auto;
  min-height: var(--footer-height, ${resolveFooterHeightPx(FOOTER_STYLE_DEFAULTS)});
  background: var(--footer-bg, ${FOOTER_STYLE_DEFAULTS.bgColor});
  color: var(--footer-text, ${FOOTER_STYLE_DEFAULTS.textColor});
}
.footer-inner {
  max-width: 72rem;
  margin: 0 auto;
  min-height: 100%;
  box-sizing: border-box;
  padding: var(--footer-padding-y, ${FOOTER_PADDING_Y[FOOTER_STYLE_DEFAULTS.paddingY]}) 1rem;
}
@media (min-width: 640px) {
  .footer-inner { padding-left: 1.5rem; padding-right: 1.5rem; }
}
@media (min-width: 1024px) {
  .footer-inner { padding-left: 2rem; padding-right: 2rem; }
}

.footer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2.5rem;
}
@media (min-width: 640px) {
  .footer-grid { grid-template-columns: repeat(var(--footer-cols, 1), 1fr); }
  .footer-col  { grid-column: span var(--col-span, 1); }
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.footer-headline {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--footer-headline, ${FOOTER_STYLE_DEFAULTS.headlineColor});
  margin: 0;
}

.footer-text {
  font-size: 0.875rem;
  color: var(--footer-link, ${FOOTER_STYLE_DEFAULTS.linkColor});
  line-height: 1.625;
}
.footer-text p { margin: 0 0 0.5rem; }
.footer-text p:last-child { margin-bottom: 0; }
.footer-text a {
  color: var(--footer-link, ${FOOTER_STYLE_DEFAULTS.linkColor});
  text-decoration: underline;
  transition: color 0.15s;
}
.footer-text a:hover { color: var(--footer-link-hover, ${FOOTER_STYLE_DEFAULTS.linkHoverColor}); }

.footer-nav {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.footer-nav-h {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}
.footer-nav a {
  font-size: 0.875rem;
  color: var(--footer-link, ${FOOTER_STYLE_DEFAULTS.linkColor});
  text-decoration: none;
  transition: color 0.15s;
}
.footer-nav a:hover { color: var(--footer-link-hover, ${FOOTER_STYLE_DEFAULTS.linkHoverColor}); }

.footer-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  text-decoration: none;
  transition: opacity 0.15s;
  cursor: pointer;
}
.footer-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}
.footer-btn-icon svg {
  display: block;
}
.footer-btn:hover { opacity: 0.9; }
.footer-separator {
  border: none;
  border-top: 1px solid currentColor;
  opacity: 0.2;
  margin: 0.25rem 0;
}
.footer-spacer {
  flex: 1 1 0;
  min-height: 0;
}
.footer-col {
  height: 100%;
}
.footer-btn-filled  { background: var(--footer-btn, ${FOOTER_STYLE_DEFAULTS.buttonColor}); color: var(--footer-btn-text, ${FOOTER_STYLE_DEFAULTS.buttonTextColor}); border: 1px solid var(--footer-btn, ${FOOTER_STYLE_DEFAULTS.buttonColor}); }
.footer-btn-outline { background: transparent; color: var(--footer-btn, ${FOOTER_STYLE_DEFAULTS.buttonColor}); border: 1px solid var(--footer-btn, ${FOOTER_STYLE_DEFAULTS.buttonColor}); }
.footer-btn-ghost   { background: transparent; color: var(--footer-link, ${FOOTER_STYLE_DEFAULTS.linkColor}); border: none; padding-left: 0; }
.footer-btn-ghost:hover { color: var(--footer-link-hover, ${FOOTER_STYLE_DEFAULTS.linkHoverColor}); opacity: 1; }

.footer-social {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--footer-link, ${FOOTER_STYLE_DEFAULTS.linkColor});
}
.footer-social a {
  color: inherit;
  display: inline-flex;
  align-items: center;
  line-height: 0;
  transition: color 0.15s;
}
.footer-social a:hover { color: var(--footer-link-hover, ${FOOTER_STYLE_DEFAULTS.linkHoverColor}); }
.footer-social a svg { display: block; }
.footer-social-left   { justify-content: flex-start; }
.footer-social-center { justify-content: center; }
.footer-social-right  { justify-content: flex-end; }
.footer-social-sm { font-size: 16px; gap: 0.5rem; }
.footer-social-md { font-size: 20px; gap: 0.75rem; }
.footer-social-lg { font-size: 24px; gap: 1rem; }
.footer-social-sm a svg { width: 1em; height: 1em; }
.footer-social-md a svg { width: 1em; height: 1em; }
.footer-social-lg a svg { width: 1em; height: 1em; }
`;

/**
 * Builds an inline `style` attribute string that sets the footer CSS custom
 * properties for a given `FooterStyle` config.
 *
 * Apply to the `.footer-root` element:
 * ```html
 * <footer class="footer-root" style={footerStyleVars(config.style)}>
 * ```
 */
export function footerStyleVars(style?: FooterStyle): string {
  const s = { ...FOOTER_STYLE_DEFAULTS, ...style };
  return [
    `--footer-bg:${s.bgColor}`,
    `--footer-text:${s.textColor}`,
    `--footer-headline:${s.headlineColor}`,
    `--footer-link:${s.linkColor}`,
    `--footer-link-hover:${s.linkHoverColor}`,
    `--footer-btn:${s.buttonColor}`,
    `--footer-btn-text:${s.buttonTextColor}`,
    `--footer-height:${resolveFooterHeightPx(s)}`,
    `--footer-padding-y:${FOOTER_PADDING_Y[s.paddingY]}`,
  ].join(";");
}
