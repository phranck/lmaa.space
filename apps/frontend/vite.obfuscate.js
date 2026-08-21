import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// A CommonJS module, so it arrives as one object rather than as named exports.
import JavaScriptObfuscator from "javascript-obfuscator";

/**
 * How the browser bundle is obfuscated.
 *
 * The same settings `phranck/velvet` uses in `site/vite.static-tool.ts`, so the
 * two projects answer this question once rather than twice.
 *
 * Minification has already taken the identifiers. What it leaves in plain sight
 * are the string literals, and those are the readable part of a bundle: route
 * paths, storage keys, selectors and messages say what the code does far more
 * plainly than any identifier would. The string table is what covers them, and
 * on this bundle it is the whole of what obfuscation adds.
 *
 * Nothing here slows the page down on purpose. Self-defence, debugger traps,
 * number expressions and control-flow flattening each buy nothing against a
 * reader with the tools to look, and cost every reader who has none. The last
 * of them measured at more than twice the transferred size.
 *
 * `renameProperties` stays off. It renames the members of every object,
 * including the ones a browser API or a `JSON.parse` result supplies, which
 * breaks code rather than hiding it.
 */
const OBFUSCATOR_OPTIONS = {
  compact: true,
  identifierNamesGenerator: "mangled",
  simplify: true,
  stringArray: true,
  stringArrayThreshold: 1,
  selfDefending: false,
  debugProtection: false,
  disableConsoleOutput: false,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  numbersToExpressions: false,
  renameGlobals: false,
  renameProperties: false,
};

/**
 * Whether a module in a chunk is one of ours.
 *
 * Virtual modules carry a prefix rather than a path, so an absolute path is
 * what distinguishes a real file from one a plugin made up. The workspace
 * packages resolve to their place under `packages/`, because Vite follows the
 * symlinks npm puts in `node_modules`, so they count as ours as well.
 *
 * @param moduleId - Module id as the bundler reports it.
 * @returns `true` for a file in this repository outside `node_modules`.
 */
function isFirstPartyModule(moduleId) {
  return moduleId.startsWith("/") && !moduleId.includes("/node_modules/");
}

/**
 * Obfuscates the chunks of the browser bundle that contain code of ours.
 *
 * A chunk built entirely from dependencies is left alone. Its source is
 * published on npm, so covering it hides nothing and costs bytes on every
 * visit. It also avoids a defect rather than merely a cost: hls.js builds its
 * worker by stringifying a function and handing the text to `createObjectURL`,
 * and a function that has been rewritten to read its strings from a table loses
 * that table the moment it is torn out of its module.
 *
 * The hook runs before the bundler minifies and before it names each file after
 * its contents, which is what keeps the published name and the published bytes
 * in step. Minifying afterwards also takes back most of what the obfuscator's
 * own printer adds, since it prints its output rather than passing esbuild's
 * through.
 *
 * The seed is derived from the chunk itself, so a build of unchanged sources
 * produces an unchanged file. Left to chance, every deployment would rewrite
 * every chunk of ours and empty every reader's cache for nothing.
 *
 * Which build a chunk belongs to is read from the output options that come with
 * it, rather than from a flag set when the configuration resolved. Astro runs
 * Vite four times over, for the browser bundle, the server entrypoints and the
 * prerender pass, and it resolves all four configurations before it builds any
 * of them, so anything a plugin remembers from that point describes the last
 * one rather than the current one. It also reports `build.ssr` as true in all
 * four, which is why the output directory is what decides.
 *
 * @returns An Astro integration that registers the Vite plugin.
 */
export function obfuscateFirstPartyChunks() {
  let clientOutDir = "";

  const plugin = {
    name: "lmaa-obfuscate-first-party",
    apply: "build",
    enforce: "post",
    renderChunk(code, chunk, options) {
      // The server bundle runs on our own machine, where there is nothing to
      // hide from anybody, and it carries the script hashes Astro computed for
      // the content security policy.
      if (clientOutDir === "" || options?.dir === undefined) return null;
      if (resolve(options.dir) !== clientOutDir) return null;
      if (!chunk.moduleIds?.some(isFirstPartyModule)) return null;

      const seed = Number.parseInt(
        createHash("sha256").update(code).digest("hex").slice(0, 12),
        16,
      );

      return {
        code: JavaScriptObfuscator.obfuscate(code, {
          ...OBFUSCATOR_OPTIONS,
          seed,
        }).getObfuscatedCode(),
        map: null,
      };
    },
  };

  return {
    name: "lmaa-obfuscate-first-party",
    hooks: {
      "astro:config:setup"({ updateConfig }) {
        updateConfig({ vite: { plugins: [plugin] } });
      },
      "astro:config:done"({ config }) {
        clientOutDir = resolve(fileURLToPath(config.build.client));
      },
    },
  };
}
