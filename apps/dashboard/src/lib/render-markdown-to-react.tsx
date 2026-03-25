import type { Marked } from "marked";
import { Fragment, type ReactNode } from "react";

type MarkdownToken = {
  type: string;
  depth?: number;
  href?: string | null;
  items?: MarkdownToken[];
  lang?: string;
  ordered?: boolean;
  raw?: string;
  start?: number;
  text?: string;
  tokens?: MarkdownToken[];
};

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

function getSafeHref(href: string | null | undefined): string | null {
  if (!href) return null;

  try {
    const url = new URL(href, window.location.origin);
    if (SAFE_LINK_PROTOCOLS.has(url.protocol)) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

function renderInlineTokens(tokens: MarkdownToken[], keyPrefix: string): ReactNode[] {
  return tokens.flatMap((token, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (token.type) {
      case "br":
        return <br key={key} />;
      case "codespan":
        return <code key={key}>{token.text ?? ""}</code>;
      case "em":
        return <em key={key}>{renderInlineTokens(token.tokens ?? [], key)}</em>;
      case "link":
      case "url": {
        const href = getSafeHref(token.href);
        const children =
          token.tokens && token.tokens.length > 0
            ? renderInlineTokens(token.tokens, key)
            : (token.text ?? href ?? "");

        return href ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ) : (
          <Fragment key={key}>{children}</Fragment>
        );
      }
      case "strong":
        return <strong key={key}>{renderInlineTokens(token.tokens ?? [], key)}</strong>;
      case "text":
        return token.tokens && token.tokens.length > 0 ? (
          <Fragment key={key}>{renderInlineTokens(token.tokens, key)}</Fragment>
        ) : (
          <Fragment key={key}>{token.text ?? ""}</Fragment>
        );
      default:
        return <Fragment key={key}>{token.text ?? token.raw ?? ""}</Fragment>;
    }
  });
}

function renderBlockTokens(tokens: MarkdownToken[], keyPrefix: string): ReactNode[] {
  return tokens.flatMap((token, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (token.type) {
      case "blockquote":
        return <blockquote key={key}>{renderBlockTokens(token.tokens ?? [], key)}</blockquote>;
      case "code":
        return (
          <pre key={key}>
            <code>{token.text ?? ""}</code>
          </pre>
        );
      case "heading": {
        const Tag = HEADING_TAGS[Math.min(Math.max(token.depth ?? 1, 1), 6) - 1] ?? "h1";
        return <Tag key={key}>{renderInlineTokens(token.tokens ?? [], key)}</Tag>;
      }
      case "html":
        return null;
      case "list": {
        const ListTag = token.ordered ? "ol" : "ul";
        return (
          <ListTag key={key} start={token.ordered ? token.start : undefined}>
            {(token.items ?? []).map((item) => (
              <li key={`${key}-item-${item.raw ?? item.text ?? "item"}`}>
                {item.tokens && item.tokens.length > 0
                  ? renderBlockTokens(item.tokens, `${key}-item-${item.raw ?? item.text ?? "item"}`)
                  : renderInlineTokens(
                      item.tokens ?? [],
                      `${key}-item-${item.raw ?? item.text ?? "item"}`,
                    )}
              </li>
            ))}
          </ListTag>
        );
      }
      case "paragraph":
        return <p key={key}>{renderInlineTokens(token.tokens ?? [], key)}</p>;
      case "space":
        return null;
      case "text":
        return token.tokens && token.tokens.length > 0 ? (
          <Fragment key={key}>{renderInlineTokens(token.tokens, key)}</Fragment>
        ) : (
          <p key={key}>{token.text ?? ""}</p>
        );
      default:
        return null;
    }
  });
}

/**
 * Converts a markdown string to a React node tree using a provided `marked` lexer.
 *
 * Only a subset of Markdown is rendered (headings, paragraphs, lists, code, links, emphasis).
 * Unsupported token types are silently skipped.
 *
 * @param markdown - Raw markdown string.
 * @param marked - An object implementing `marked.lexer` (the `Marked` instance).
 * @returns React node tree representing the parsed markdown.
 */
export function renderMarkdownToReact(markdown: string, marked: Pick<Marked, "lexer">): ReactNode {
  return renderBlockTokens(marked.lexer(markdown) as MarkdownToken[], "md");
}
