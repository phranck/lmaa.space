import type { SourceCodeTransformer } from "unocss";

/**
 * Splits a declaration list on the semicolons that separate declarations.
 *
 * @param body - Contents of a CSS block, without the surrounding braces.
 * @returns The declarations, without their separators and without empty entries.
 *
 * @remarks
 * A semicolon inside parentheses or inside a string belongs to a value rather
 * than to the list, so `--x: cubic-bezier(0, 0; 1, 1)` stays one declaration.
 */
function splitDeclarations(body: string): string[] {
  const declarations: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = "";

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];

    if (quote) {
      if (character === quote && body[index - 1] !== "\\") quote = "";
      continue;
    }

    if (character === '"' || character === "'") quote = character;
    else if (character === "(") depth += 1;
    else if (character === ")") depth -= 1;
    else if (character === ";" && depth === 0) {
      declarations.push(body.slice(start, index));
      start = index + 1;
    }
  }

  declarations.push(body.slice(start));
  return declarations.filter((declaration) => declaration.trim() !== "");
}

/**
 * Reads the property name a declaration sets.
 *
 * @param declaration - One declaration, such as `--un-scale-x:1`.
 * @returns The name, or `null` when the text is not a single declaration.
 */
function propertyName(declaration: string): string | null {
  const colon = declaration.indexOf(":");
  if (colon < 0) return null;
  return declaration.slice(0, colon).trim();
}

/**
 * Sorts the declarations of a block when they are all custom properties.
 *
 * @param body - Contents of one block, without the surrounding braces.
 * @returns The block sorted by property name, or `null` when it is left alone.
 *
 * @remarks
 * Custom properties resolve where they are used rather than where they are
 * declared, so their order carries no meaning and sorting them changes nothing
 * a browser can observe. That holds only whilst each name appears once, because
 * a repeated name is decided by the last declaration, so a block with a
 * duplicate is left exactly as it came.
 */
function sortBlockBody(body: string): string | null {
  const declarations = splitDeclarations(body);
  if (declarations.length < 2) return null;

  const names = declarations.map(propertyName);
  if (!names.every((name) => name !== null && name.startsWith("--"))) return null;
  if (new Set(names).size !== names.length) return null;

  const sorted = [...declarations].sort((left, right) =>
    (propertyName(left) ?? "").localeCompare(propertyName(right) ?? "", "en"),
  );

  return sorted.join(";");
}

/**
 * Sorts every block of custom properties in a stylesheet by property name.
 *
 * @param css - The stylesheet, minified or not.
 * @returns The stylesheet with those blocks in a fixed order.
 *
 * @remarks
 * UnoCSS collects the theme keys and the registered properties a page uses
 * whilst it generates utilities, and writes each set out in the order it met
 * them. That order follows how the bundler happened to schedule the files, so
 * two builds of one tree emit the same declarations differently arranged. The
 * bytes then differ, the content hash with them, and every reader fetches a
 * stylesheet they already hold.
 *
 * Only innermost blocks are considered, which is what makes the guard in
 * `sortBlockBody` sufficient: a block holding another block holds no
 * declarations of its own.
 */
export function sortCustomPropertyBlocks(css: string): string {
  let result = "";
  let index = 0;

  while (index < css.length) {
    const open = css.indexOf("{", index);
    if (open < 0) {
      result += css.slice(index);
      break;
    }

    const nextOpen = css.indexOf("{", open + 1);
    const close = css.indexOf("}", open + 1);

    if (close < 0) {
      result += css.slice(index);
      break;
    }

    // A block that opens another one before it closes is not innermost, so its
    // opening brace is passed through and the search continues inside it.
    if (nextOpen >= 0 && nextOpen < close) {
      result += css.slice(index, open + 1);
      index = open + 1;
      continue;
    }

    const body = css.slice(open + 1, close);
    const sorted = sortBlockBody(body);
    result += css.slice(index, open + 1) + (sorted ?? body) + "}";
    index = close + 1;
  }

  return result;
}

/**
 * Keeps the generated stylesheet byte-identical across builds of one tree.
 *
 * @returns A UnoCSS transformer that sorts the custom-property blocks it is
 * handed.
 *
 * @remarks
 * A transformer rather than a Vite plugin, because the generated CSS never
 * passes through a plugin hook of ours. UnoCSS builds it in its own
 * `renderChunk` and hands it straight to Vite's `vite:css-post`, which emits
 * the asset and fixes its name at that moment. A `generateBundle` hook can
 * still change the bytes, and the name then describes bytes that no longer
 * ship. The transformer runs whilst the preflight layers are still text, which
 * is before any of that.
 */
export function transformerStableCustomPropertyOrder(): SourceCodeTransformer {
  return {
    name: "lmaa-stable-custom-property-order",
    enforce: "post",
    idFilter: (id) => id.endsWith(".css"),
    transform(code) {
      const original = code.toString();
      const sorted = sortCustomPropertyBlocks(original);
      if (sorted !== original) code.overwrite(0, original.length, sorted);
    },
  };
}
