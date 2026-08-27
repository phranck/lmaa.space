import {
  MARKDOWN_SHORTCODE_DEFINITIONS,
  type MarkdownShortcodeDefinition,
  type MarkdownShortcodeParamDefinition,
} from "../markdown-shortcodes.js";
import { tokenizeShortcodes, type ShortcodeNode } from "./markdown-shortcode-tokenizer.js";

export type MarkdownShortcodeAttributeValue = string | true;

export interface MarkdownShortcodeAttribute {
  name: string;
  value: MarkdownShortcodeAttributeValue;
  quoted: "bare" | "double" | "flag" | "single";
}

export type MarkdownShortcodeIssueCode =
  | "body-forbidden"
  | "invalid-attribute"
  | "invalid-param"
  | "missing-body"
  | "missing-param"
  | "missing-param-value"
  | "missing-target"
  | "target-forbidden"
  | "unterminated-attribute"
  | "unterminated-body";

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
  /** Nodes nested inside this one, resolved against its own child list. */
  children: ParsedMarkdownShortcode[];
  /** What stood between the braces, on a shortcode that takes a body. */
  body?: string;
  issues: MarkdownShortcodeIssue[];
  source: {
    start: number;
    end: number;
    raw: string;
  };
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

/**
 * Checks a node's body against what its definition allows.
 *
 * A body written on a shortcode that draws one thing is a misunderstanding
 * worth reporting rather than ignoring: the author expected the text to appear
 * and it would not.
 */
function validateBody(
  definition: MarkdownShortcodeDefinition,
  body: string | undefined,
): MarkdownShortcodeIssue[] {
  const takesBody = definition.body === "markdown";

  if (takesBody && body === undefined) {
    return [
      {
        code: "missing-body",
        message: `Shortcode "${definition.token}" needs a body in braces.`,
      },
    ];
  }

  if (!takesBody && body !== undefined) {
    return [
      {
        code: "body-forbidden",
        message: `Shortcode "${definition.token}" does not take a body.`,
      },
    ];
  }

  return [];
}

/**
 * Turns one of the tokenizer's findings into an issue this interface can carry.
 *
 * The tokenizer reports an offset into the source, which has no place in a
 * parsed shortcode, so what survives is the code and the message.
 */
function carryOverIssue(code: ShortcodeNode["issues"][number]["code"]): MarkdownShortcodeIssueCode {
  if (code === "unterminated-value") return "unterminated-attribute";
  if (code === "unterminated-body") return "unterminated-body";
  return "invalid-attribute";
}

/**
 * Resolves one tokenized node against a definition, and its children against
 * that definition's own child list.
 *
 * @returns The parsed shortcode, or `null` when no definition claims the token.
 */
function resolveNode(
  node: ShortcodeNode,
  definitionByToken: Map<string, MarkdownShortcodeDefinition>,
): ParsedMarkdownShortcode | null {
  const definition = definitionByToken.get(node.token);
  if (!definition) return null;

  const { params, issues: paramIssues } = normalizeParams(definition, node.attributes);

  const childDefinitions = new Map(
    (definition.children ?? []).map((child) => [child.token, child]),
  );
  const children: ParsedMarkdownShortcode[] = [];
  for (const child of node.children) {
    const resolved = resolveNode(child, childDefinitions);
    if (resolved) children.push(resolved);
  }

  return {
    token: node.token,
    definition,
    target: node.target,
    attributes: node.attributes,
    rawAttributes: node.rawAttributes,
    params,
    children,
    body: node.body,
    issues: [
      ...validateTarget(definition, node.target),
      ...validateBody(definition, node.body),
      ...node.issues.map((issue) => ({
        code: carryOverIssue(issue.code),
        message: issue.message,
      })),
      ...paramIssues,
    ],
    source: node.source,
  };
}

/**
 * Parses every shortcode in `content`.
 *
 * Only top-level nodes are returned. A nested one hangs off its parent's
 * `children`, resolved against the parent definition's own child list, so a
 * token means what its position says it means.
 *
 * @param content - The Markdown source.
 * @param definitions - Definitions to resolve top-level tokens against.
 * @returns The shortcodes found, in the order they appear.
 */
export function parseMarkdownShortcodes(
  content: string,
  definitions: readonly MarkdownShortcodeDefinition[] = MARKDOWN_SHORTCODE_DEFINITIONS,
): ParsedMarkdownShortcode[] {
  const definitionByToken = new Map(
    definitions.map((definition) => [definition.token, definition]),
  );

  const parsed: ParsedMarkdownShortcode[] = [];
  for (const node of tokenizeShortcodes(content)) {
    const resolved = resolveNode(node, definitionByToken);
    if (resolved) parsed.push(resolved);
  }

  return parsed;
}
