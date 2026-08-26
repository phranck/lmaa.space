/**
 * The duotone shape of one Phosphor icon, as the two paths it is drawn from.
 *
 * @property d The path itself.
 * @property opacity Set on the shape that carries the second tone, absent on
 *   the one drawn at full strength.
 */
export interface DuotonePath {
  d: string;
  opacity?: string;
}

/**
 * Every icon the package ships, keyed by the file it lives in.
 *
 * Loaded one at a time rather than all at once: the whole set is 13 MB, and a
 * page carries a handful of icons at most. Vite turns each entry into its own
 * chunk, so asking for one pulls one.
 */
const DEFINITIONS = import.meta.glob<Record<string, unknown>>(
  "../../../../node_modules/@phosphor-icons/react/dist/defs/*.es.js",
);

/** The prefix the glob's own keys carry, so a name can be turned into one. */
const DEFINITION_PREFIX = "../../../../node_modules/@phosphor-icons/react/dist/defs/";

/** What has already been read, so a second page pays nothing for the same icon. */
const cache = new Map<string, DuotonePath[] | null>();

/**
 * The file name an icon goes by, from the spelling Phosphor publishes.
 *
 * `x-circle` becomes `XCircle`, which is how the definition files are named.
 *
 * @param name - The icon in its published spelling.
 * @returns The file's base name, or `null` for anything that is not one.
 */
function fileNameFor(name: string): string | null {
  const trimmed = name.trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(trimmed)) return null;
  return trimmed
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Reads the two duotone paths out of a loaded definition.
 *
 * The definitions hold React elements, and this walks them as the plain objects
 * they are rather than rendering them. Rendering would mean pulling a whole
 * renderer into a path that only needs two strings.
 *
 * @param module - The loaded definition module.
 * @returns The paths, or `null` when the module is not shaped as expected.
 */
function readDuotonePaths(module: Record<string, unknown>): DuotonePath[] | null {
  const weights = (module.default ?? Object.values(module)[0]) as
    | Map<string, { props?: { children?: unknown } }>
    | undefined;
  if (!(weights instanceof Map)) return null;

  const children = weights.get("duotone")?.props?.children;
  const list = Array.isArray(children) ? children : [children];
  const paths: DuotonePath[] = [];

  for (const child of list) {
    const element = child as { type?: unknown; props?: { d?: unknown; opacity?: unknown } } | null;
    if (element?.type !== "path" || typeof element.props?.d !== "string") continue;
    paths.push({
      d: element.props.d,
      opacity: typeof element.props.opacity === "string" ? element.props.opacity : undefined,
    });
  }

  return paths.length > 0 ? paths : null;
}

/**
 * Loads the icons a text asks for, so the renderer can draw them synchronously.
 *
 * Called before rendering, because the renderer that puts markup together does
 * not wait for anything. Names that do not exist are remembered as absent, so a
 * typo in a page is not looked up again on every render.
 *
 * @param names - The icons named in the text, in their published spelling.
 */
export async function loadDuotoneIcons(names: Iterable<string>): Promise<void> {
  const wanted = [...new Set(names)].filter((name) => !cache.has(name));
  if (wanted.length === 0) return;

  await Promise.all(
    wanted.map(async (name) => {
      const file = fileNameFor(name);
      const load = file ? DEFINITIONS[`${DEFINITION_PREFIX}${file}.es.js`] : undefined;
      if (!load) {
        cache.set(name, null);
        return;
      }
      try {
        cache.set(name, readDuotonePaths(await load()));
      } catch {
        cache.set(name, null);
      }
    }),
  );
}

/**
 * The duotone paths of an icon that has already been loaded.
 *
 * @param name - The icon in its published spelling.
 * @returns The paths, or `null` when there is no such icon or it was never
 *   asked for.
 */
export function duotonePaths(name: string): DuotonePath[] | null {
  return cache.get(name) ?? null;
}
