import {
  PUBLIC_REJECTED_SHOP_DEFAULT_PAGE_SIZE,
  PUBLIC_REJECTED_SHOP_PAGE_SIZES,
  type PublicRejectedShopPageSize,
} from "@lmaa/contracts";
import {
  MARKDOWN_SHORTCODE_TOKENS,
  parseMarkdownShortcodes,
  SUPPORT_LADDER_LABEL_KEYS,
  type MarkdownShortcodeParamValue,
  type ParsedMarkdownShortcode,
  type SupportLadderLabelKey,
} from "@lmaa/shared";

export interface RejectedShopsTableIsland {
  type: "rejected-shops-table";
  defaultPageSize: PublicRejectedShopPageSize;
  storageKey: string;
}

/** One suggested amount, and what that amount pays for. */
export interface SupportLadderOption {
  amountEur: number;
  description: string;
  /** Marks the amount the ladder starts on. */
  recommended: boolean;
}

/** The free-amount field of an interval. */
export interface SupportLadderCustomAmount {
  label: string;
  placeholder: string;
  /** A sentence under the field. Empty when the interval names none. */
  text: string;
}

/** One frequency tab and the amounts it offers. */
export interface SupportLadderInterval {
  key: "once" | "monthly";
  label: string;
  text: string;
  options: SupportLadderOption[];
  /** Absent when the interval offers no free amount. */
  custom?: SupportLadderCustomAmount;
}

/** How a payment block presents itself for one interval. */
export interface SupportLadderVariant {
  key: "once" | "monthly";
  title: string;
  text: string;
  /** Draws the block as the suggested route for that interval. */
  recommended: boolean;
  /** Name of the brand mark shown beside the heading. */
  icon?: string;
  /** Appearance of the GiroCode. Only the single-payment variant has one. */
  qr?: SupportLadderQrStyle;
  /** A notice drawn as a tinted sub-card. Absent when the page names none. */
  info?: string;
}

/**
 * Appearance of the GiroCode.
 *
 * Every field is optional, so the page names only what it wants to change and
 * the renderer keeps its own value for the rest.
 */
export interface SupportLadderQrStyle {
  color?: string;
  background?: string;
  size?: number;
  margin?: number;
  dots?: string;
  corners?: string;
  image?: string;
}

/** The bank account, with its per-interval presentation. */
export interface SupportLadderBankAccount {
  beneficiaryName: string;
  iban: string;
  bic?: string;
  purpose?: string;
  variants: SupportLadderVariant[];
}

/**
 * An external route the ladder links out to.
 *
 * PayPal and GitHub Sponsors carry the same fields and differ only in when they
 * are shown, so they share a shape rather than each having their own.
 */
export interface SupportLadderLink {
  url: string;
  title: string;
  text: string;
  button: string;
  /** Name of the brand mark shown beside the heading. */
  icon?: string;
}

/** The child nodes that stand for a route out of the page. */
export const SUPPORT_LADDER_ROUTE_TOKENS = {
  paypalme: "PayPal",
  sponsors: "GitHub Sponsors",
} as const;

/** Name of one such node. */
export type SupportLadderRouteToken = keyof typeof SUPPORT_LADDER_ROUTE_TOKENS;

/**
 * One route out of the page, in the order the document names it.
 *
 * Which node it came from decides when the ladder shows it: PayPal.Me pays once
 * and appears only under the single payment, whilst GitHub Sponsors carries a
 * subscription and appears under both.
 */
export interface SupportLadderRoute extends SupportLadderLink {
  token: SupportLadderRouteToken;
}

export interface SupportLadderIsland {
  type: "support-ladder";
  bankAccount?: SupportLadderBankAccount;
  intervals: SupportLadderInterval[];
  /** Every route out of the page, in the order the document names them. */
  routes: SupportLadderRoute[];
  /** Wording overrides for everything outside the child nodes. */
  labels: Partial<Record<SupportLadderLabelKey, string>>;
}

export type ContentShortcodeSegment =
  | { type: "markdown"; content: string }
  | RejectedShopsTableIsland
  | SupportLadderIsland;

/**
 * Turns the escape sequences an author can type inside a quoted attribute into
 * the characters they stand for.
 *
 * A shortcode attribute is one quoted run, so a real line break cannot be typed
 * into it. `\n` is how an author writes one, and Markdown then treats it as it
 * would any other newline.
 */
function unescapeText(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function getStringParam(value: MarkdownShortcodeParamValue | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

const VALID_PAGE_SIZES = new Set<PublicRejectedShopPageSize>(PUBLIC_REJECTED_SHOP_PAGE_SIZES);

function normalizePageSize(
  value: MarkdownShortcodeParamValue | undefined,
): PublicRejectedShopPageSize {
  const normalized = getStringParam(value)?.trim().toLowerCase();
  return VALID_PAGE_SIZES.has(normalized as PublicRejectedShopPageSize)
    ? (normalized as PublicRejectedShopPageSize)
    : PUBLIC_REJECTED_SHOP_DEFAULT_PAGE_SIZE;
}

function normalizeStorageKey(
  value: MarkdownShortcodeParamValue | undefined,
  index: number,
): string {
  const normalized = getStringParam(value)
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  return normalized && normalized.length <= 80 ? normalized : `default-${index}`;
}

function isRenderableRejectedShopsTable(
  shortcode: ParsedMarkdownShortcode,
): shortcode is ParsedMarkdownShortcode & {
  token: typeof MARKDOWN_SHORTCODE_TOKENS.rejectedShopsTable;
} {
  return (
    shortcode.token === MARKDOWN_SHORTCODE_TOKENS.rejectedShopsTable &&
    !shortcode.issues.some((issue) => issue.code === "target-forbidden")
  );
}

function isFlagSet(node: ParsedMarkdownShortcode, name: string): boolean {
  return node.attributes[name] !== undefined;
}

function childrenOf(node: ParsedMarkdownShortcode, token: string): ParsedMarkdownShortcode[] {
  return node.children.filter((child) => child.token === token);
}

function asIntervalKey(value: string | undefined): "once" | "monthly" | null {
  return value === "once" || value === "monthly" ? value : null;
}

/**
 * Reads the amounts of one interval.
 *
 * An option without a usable amount is dropped rather than throwing, so a typo
 * in the page content cannot take the whole page down.
 */
function readOptions(interval: ParsedMarkdownShortcode): SupportLadderOption[] {
  const options: SupportLadderOption[] = [];
  // Only one option may be recommended, because the flag decides which amount
  // the ladder starts on and two answers to that question is no answer. The
  // first wins, so the page reads top to bottom.
  let recommendedTaken = false;

  for (const node of childrenOf(interval, "option")) {
    const raw = getStringParam(node.params.amount)?.trim().replace(",", ".");
    const amountEur = Number.parseFloat(raw ?? "");
    if (!Number.isFinite(amountEur) || amountEur <= 0) continue;

    const recommended = isFlagSet(node, "recommended") && !recommendedTaken;
    if (recommended) recommendedTaken = true;

    options.push({
      amountEur,
      description: unescapeText(getStringParam(node.params.description)?.trim() ?? ""),
      recommended,
    });
  }

  return options;
}

/**
 * Reads the frequency tabs.
 *
 * A second interval carrying a key already seen is dropped, because silently
 * replacing the first would make the order of the page content decide which
 * one survives.
 */
function readIntervals(ladder: ParsedMarkdownShortcode): SupportLadderInterval[] {
  const intervals: SupportLadderInterval[] = [];
  const seen = new Set<string>();

  for (const node of childrenOf(ladder, "interval")) {
    const key = asIntervalKey(getStringParam(node.params.key));
    if (!key || seen.has(key)) continue;

    const options = readOptions(node);
    if (options.length === 0) continue;

    const customNode = childrenOf(node, "custom")[0];

    seen.add(key);
    intervals.push({
      key,
      label: getStringParam(node.params.label)?.trim() ?? "",
      text: unescapeText(getStringParam(node.params.text)?.trim() ?? ""),
      options,
      custom: customNode
        ? {
            label: getStringParam(customNode.params.label)?.trim() ?? "Eigener Betrag",
            placeholder: getStringParam(customNode.params.placeholder)?.trim() ?? "",
            text: unescapeText(getStringParam(customNode.params.text)?.trim() ?? ""),
          }
        : undefined,
    });
  }

  return intervals;
}

/** Reads the appearance of a variant's GiroCode, if it names one. */
function readQrStyle(variant: ParsedMarkdownShortcode): SupportLadderQrStyle | undefined {
  const node = childrenOf(variant, "qrcode")[0];
  if (!node) return undefined;

  return {
    color: getStringParam(node.params.color)?.trim() || undefined,
    background: getStringParam(node.params.background)?.trim() || undefined,
    size: typeof node.params.size === "number" ? node.params.size : undefined,
    margin: typeof node.params.margin === "number" ? node.params.margin : undefined,
    dots: getStringParam(node.params.dots)?.trim() || undefined,
    corners: getStringParam(node.params.corners)?.trim() || undefined,
    image: getStringParam(node.params.image)?.trim() || undefined,
  };
}

/** Reads the bank account and how it presents itself per interval. */
function readBankAccount(ladder: ParsedMarkdownShortcode): SupportLadderBankAccount | undefined {
  const node = childrenOf(ladder, "bankaccount")[0];
  if (!node) return undefined;

  const beneficiaryName = getStringParam(node.params.name)?.trim();
  const iban = getStringParam(node.params.iban)?.trim();
  if (!beneficiaryName || !iban) return undefined;

  const variants: SupportLadderVariant[] = [];
  const seen = new Set<string>();
  // The same rule as for options: one recommendation, the first one written.
  let recommendedTaken = false;

  for (const child of childrenOf(node, "variant")) {
    const key = asIntervalKey(getStringParam(child.params.key));
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const recommended = isFlagSet(child, "recommended") && !recommendedTaken;
    if (recommended) recommendedTaken = true;

    variants.push({
      key,
      title: getStringParam(child.params.title)?.trim() ?? "",
      text: unescapeText(getStringParam(child.params.text)?.trim() ?? ""),
      recommended,
      icon: getStringParam(child.params.icon)?.trim() || undefined,
      qr: readQrStyle(child),
      info: unescapeText(getStringParam(childrenOf(child, "info")[0]?.params.text)?.trim() ?? "") || undefined,
    });
  }

  return {
    beneficiaryName,
    iban,
    bic: getStringParam(node.params.bic)?.trim() || undefined,
    purpose: getStringParam(node.params.purpose)?.trim() || undefined,
    variants,
  };
}

/**
 * Reads one outgoing route, which is left out when it names no address.
 *
 * @param node - The route's own node, such as `paypalme` or `sponsors`.
 * @param fallbackTitle - Used when the node names no heading of its own.
 */
function readLink(
  node: ParsedMarkdownShortcode,
  fallbackTitle: string,
): SupportLadderLink | undefined {
  const url = getStringParam(node.params.url)?.trim();
  if (!url) return undefined;

  return {
    url,
    title: getStringParam(node.params.title)?.trim() || fallbackTitle,
    text: unescapeText(getStringParam(node.params.text)?.trim() ?? ""),
    button: getStringParam(node.params.button)?.trim() || fallbackTitle,
    icon: getStringParam(node.params.icon)?.trim() || undefined,
  };
}

/**
 * Reads every route the ladder names, in document order.
 *
 * A node without an address is dropped, because a route nobody can follow is
 * an empty card.
 */
function readRoutes(ladder: ParsedMarkdownShortcode): SupportLadderRoute[] {
  const routes: SupportLadderRoute[] = [];

  for (const child of ladder.children) {
    if (!(child.token in SUPPORT_LADDER_ROUTE_TOKENS)) continue;

    const token = child.token as SupportLadderRouteToken;
    const link = readLink(child, SUPPORT_LADDER_ROUTE_TOKENS[token]);
    if (link) routes.push({ ...link, token });
  }

  return routes;
}

function isRenderableSupportLadder(
  shortcode: ParsedMarkdownShortcode,
): shortcode is ParsedMarkdownShortcode & {
  token: typeof MARKDOWN_SHORTCODE_TOKENS.supportLadder;
} {
  return (
    shortcode.token === MARKDOWN_SHORTCODE_TOKENS.supportLadder &&
    !shortcode.issues.some((issue) => issue.code === "target-forbidden")
  );
}

/**
 * Builds the ladder island from a shortcode.
 *
 * Returns `null` when no interval carries a usable amount, because a ladder
 * with nothing to choose is worse than no ladder at all.
 */
function toSupportLadderIsland(shortcode: ParsedMarkdownShortcode): SupportLadderIsland | null {
  const intervals = readIntervals(shortcode);
  if (intervals.length === 0) return null;

  // Only labels the shortcode actually names are carried over. An empty value
  // is treated as absent, so clearing an attribute restores the default rather
  // than blanking the label.
  const labels: Partial<Record<SupportLadderLabelKey, string>> = {};
  for (const key of SUPPORT_LADDER_LABEL_KEYS) {
    const value = getStringParam(shortcode.attributes[key])?.trim();
    if (value) labels[key] = value;
  }

  return {
    type: "support-ladder",
    bankAccount: readBankAccount(shortcode),
    intervals,
    routes: readRoutes(shortcode),
    labels,
  };
}

export function parseContentShortcodeSegments(content: string): ContentShortcodeSegment[] {
  const segments: ContentShortcodeSegment[] = [];
  let lastIndex = 0;
  let tableIndex = 0;

  for (const shortcode of parseMarkdownShortcodes(content)) {
    let island: ContentShortcodeSegment | null = null;

    if (isRenderableRejectedShopsTable(shortcode)) {
      island = {
        type: "rejected-shops-table",
        defaultPageSize: normalizePageSize(shortcode.params.pageSize),
        storageKey: normalizeStorageKey(shortcode.params.id, tableIndex),
      };
      tableIndex += 1;
    } else if (isRenderableSupportLadder(shortcode)) {
      island = toSupportLadderIsland(shortcode);
    }

    if (!island) continue;

    if (shortcode.source.start > lastIndex) {
      segments.push({
        type: "markdown",
        content: content.slice(lastIndex, shortcode.source.start),
      });
    }

    segments.push(island);
    lastIndex = shortcode.source.end;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "markdown", content: content.slice(lastIndex) });
  }

  return segments.filter((segment) => segment.type !== "markdown" || segment.content.length > 0);
}
