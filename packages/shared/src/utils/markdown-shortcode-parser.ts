import {
  MARKDOWN_SHORTCODE_DEFINITIONS,
  type MarkdownShortcodeDefinition,
  type MarkdownShortcodeParamDefinition,
} from "../markdown-shortcodes.js";

export type MarkdownShortcodeAttributeValue = string | true;

export interface MarkdownShortcodeAttribute {
  name: string;
  value: MarkdownShortcodeAttributeValue;
  raw: string;
  quoted: "bare" | "double" | "flag" | "single";
}

export type MarkdownShortcodeIssueCode =
  | "invalid-attribute"
  | "invalid-param"
  | "missing-param"
  | "missing-param-value"
  | "missing-target"
  | "target-forbidden"
  | "unterminated-attribute";

export interface MarkdownShortcodeIssue {
  code: MarkdownShortcodeIssueCode;
  message: string;
  attribute?: string;
}

export type MarkdownShortcodeParamValue = boolean | number | string;

export interface ParsedMarkdownShortcode {
  token: string;
  definition: MarkdownShortcodeDefinition;
  target?: string;
  attributes: Record<string, MarkdownShortcodeAttributeValue>;
  rawAttributes: MarkdownShortcodeAttribute[];
  params: Record<string, MarkdownShortcodeParamValue>;
  issues: MarkdownShortcodeIssue[];
  source: {
    start: number;
    end: number;
    raw: string;
  };
}

interface ParsedShortcodeHead {
  token: string;
  target?: string;
  attrsInput: string;
}

const SHORTCODE_REGEX = /\[\[([^\]\r\n]+)\]\]/g;
const TOKEN_REGEX = /^[a-z][a-z0-9-]*/;
const ATTRIBUTE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9-]*/;

function parseShortcodeHead(input: string): ParsedShortcodeHead | null {
  const body = input.trim();
  const tokenMatch = body.match(TOKEN_REGEX);
  if (!tokenMatch) return null;

  const token = tokenMatch[0];
  let cursor = token.length;
  let target: string | undefined;

  if (body[cursor] === ":") {
    cursor += 1;
    const targetStart = cursor;
    while (cursor < body.length && !/\s/.test(body[cursor])) {
      cursor += 1;
    }
    target = body.slice(targetStart, cursor) || undefined;
  }

  return {
    token,
    target,
    attrsInput: body.slice(cursor).trim(),
  };
}

function parseAttributes(input: string): {
  attributes: Record<string, MarkdownShortcodeAttributeValue>;
  rawAttributes: MarkdownShortcodeAttribute[];
  issues: MarkdownShortcodeIssue[];
} {
  const attributes: Record<string, MarkdownShortcodeAttributeValue> = {};
  const rawAttributes: MarkdownShortcodeAttribute[] = [];
  const issues: MarkdownShortcodeIssue[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    while (cursor < input.length && /\s/.test(input[cursor])) cursor += 1;
    if (cursor >= input.length) break;

    const remaining = input.slice(cursor);
    const nameMatch = remaining.match(ATTRIBUTE_NAME_REGEX);
    if (!nameMatch) {
      issues.push({
        code: "invalid-attribute",
        message: "Shortcode attribute names must start with a letter.",
      });
      break;
    }

    const name = nameMatch[0];
    const rawStart = cursor;
    cursor += name.length;

    if (input[cursor] !== "=") {
      const raw = input.slice(rawStart, cursor);
      attributes[name] = true;
      rawAttributes.push({ name, value: true, raw, quoted: "flag" });
      continue;
    }

    cursor += 1;
    if (cursor >= input.length) {
      issues.push({
        code: "missing-param-value",
        message: `Shortcode attribute "${name}" is missing a value.`,
        attribute: name,
      });
      break;
    }

    const quote = input[cursor];
    let value = "";
    let quoted: MarkdownShortcodeAttribute["quoted"] = "bare";

    if (quote === '"' || quote === "'") {
      quoted = quote === '"' ? "double" : "single";
      cursor += 1;
      const valueStart = cursor;
      while (cursor < input.length && input[cursor] !== quote) {
        cursor += 1;
      }

      if (cursor >= input.length) {
        issues.push({
          code: "unterminated-attribute",
          message: `Shortcode attribute "${name}" has an unterminated quoted value.`,
          attribute: name,
        });
        value = input.slice(valueStart);
      } else {
        value = input.slice(valueStart, cursor);
        cursor += 1;
      }
    } else {
      const valueStart = cursor;
      while (cursor < input.length && !/\s/.test(input[cursor])) {
        cursor += 1;
      }
      value = input.slice(valueStart, cursor);
    }

    const raw = input.slice(rawStart, cursor);
    attributes[name] = value;
    rawAttributes.push({ name, value, raw, quoted });
  }

  return { attributes, rawAttributes, issues };
}

function findAttribute(
  attributes: Record<string, MarkdownShortcodeAttributeValue>,
  definition: MarkdownShortcodeParamDefinition,
): MarkdownShortcodeAttributeValue | undefined {
  if (definition.name in attributes) return attributes[definition.name];

  for (const alias of definition.aliases ?? []) {
    if (alias in attributes) return attributes[alias];
  }

  return undefined;
}

function normalizeIntegerParam(
  definition: MarkdownShortcodeParamDefinition,
  value: string,
): number | null {
  if (!/^-?\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return null;
  if (definition.min !== undefined && parsed < definition.min) return null;
  if (definition.max !== undefined && parsed > definition.max) return null;
  return parsed;
}

function normalizeParamValue(
  definition: MarkdownShortcodeParamDefinition,
  value: MarkdownShortcodeAttributeValue,
): MarkdownShortcodeParamValue | null {
  if (value === true) {
    return definition.type === "boolean" ? true : null;
  }

  const trimmed = value.trim();
  if (definition.type === "string") return trimmed;

  if (definition.type === "integer") {
    return normalizeIntegerParam(definition, trimmed);
  }

  if (definition.type === "boolean") {
    if (trimmed.toLowerCase() === "true") return true;
    if (trimmed.toLowerCase() === "false") return false;
    return null;
  }

  if (definition.values?.includes(trimmed)) {
    return trimmed;
  }

  return null;
}

function normalizeParams(
  definition: MarkdownShortcodeDefinition,
  attributes: Record<string, MarkdownShortcodeAttributeValue>,
): { params: Record<string, MarkdownShortcodeParamValue>; issues: MarkdownShortcodeIssue[] } {
  const params: Record<string, MarkdownShortcodeParamValue> = {};
  const issues: MarkdownShortcodeIssue[] = [];

  for (const paramDefinition of definition.params) {
    const rawValue = findAttribute(attributes, paramDefinition);

    if (rawValue === undefined) {
      if (paramDefinition.defaultValue !== undefined) {
        params[paramDefinition.name] = paramDefinition.defaultValue;
      } else if (paramDefinition.required) {
        issues.push({
          code: "missing-param",
          message: `Shortcode parameter "${paramDefinition.name}" is required.`,
          attribute: paramDefinition.name,
        });
      }
      continue;
    }

    const value = normalizeParamValue(paramDefinition, rawValue);
    if (value === null) {
      issues.push({
        code: rawValue === true ? "missing-param-value" : "invalid-param",
        message: `Shortcode parameter "${paramDefinition.name}" is invalid.`,
        attribute: paramDefinition.name,
      });
      if (paramDefinition.defaultValue !== undefined) {
        params[paramDefinition.name] = paramDefinition.defaultValue;
      }
      continue;
    }

    params[paramDefinition.name] = value;
  }

  return { params, issues };
}

function validateTarget(
  definition: MarkdownShortcodeDefinition,
  target: string | undefined,
): MarkdownShortcodeIssue[] {
  if (definition.target === "required" && !target) {
    return [
      {
        code: "missing-target",
        message: `Shortcode "${definition.token}" requires a target.`,
      },
    ];
  }

  if (definition.target === "forbidden" && target) {
    return [
      {
        code: "target-forbidden",
        message: `Shortcode "${definition.token}" does not support a target.`,
      },
    ];
  }

  return [];
}

export function parseMarkdownShortcodes(
  content: string,
  definitions: readonly MarkdownShortcodeDefinition[] = MARKDOWN_SHORTCODE_DEFINITIONS,
): ParsedMarkdownShortcode[] {
  const parsed: ParsedMarkdownShortcode[] = [];
  const definitionByToken = new Map(
    definitions.map((definition) => [definition.token, definition]),
  );

  for (const match of content.matchAll(SHORTCODE_REGEX)) {
    const start = match.index ?? 0;
    if (start > 0 && content[start - 1] === "\\") continue;

    const head = parseShortcodeHead(match[1]);
    if (!head) continue;

    const definition = definitionByToken.get(head.token);
    if (!definition) continue;

    const { attributes, rawAttributes, issues: attributeIssues } = parseAttributes(head.attrsInput);
    const { params, issues: paramIssues } = normalizeParams(definition, attributes);

    parsed.push({
      token: head.token,
      definition,
      target: head.target,
      attributes,
      rawAttributes,
      params,
      issues: [...validateTarget(definition, head.target), ...attributeIssues, ...paramIssues],
      source: {
        start,
        end: start + match[0].length,
        raw: match[0],
      },
    });
  }

  return parsed;
}
