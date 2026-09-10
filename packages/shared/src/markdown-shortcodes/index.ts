/** The vocabulary every shortcode definition is written in. */
export * from "./types.js";
/** Token of every shortcode that may appear at the top level of a page. */
export * from "./tokens.js";
/** The wording the support ladder puts on screen, and its defaults. */
export * from "./support-ladder-labels.js";
/** The wording the sponsor form puts on screen, and its defaults. */
export * from "./sponsor-form-labels.js";
/** The registry itself, and the lookup by token. */
export * from "./registry.js";

// The individual definitions stay inside this directory. What leaves it are the
// two figures a renderer needs to agree with the reference on, and the registry
// that holds every definition anyway.
export { ICON_DEFAULT_SIZE, STACK_DEFAULT_SPACING_TOKEN } from "./layout.js";
