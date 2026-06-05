/**
 * Publication states supported by CMS-like content pages.
 */
export type ContentStatus = "draft" | "published" | "hidden";

/**
 * Frontend content container widths supported by editable pages.
 */
export type ContentWidth = "default" | "wide" | "full";

/**
 * Navigation buckets rendered on the website.
 */
export type NavId = "header" | "footer";

/**
 * Full content page model used in editor and public rendering.
 */
export interface ContentPage {
  slug: string;
  title: string;
  content: string;
  status: ContentStatus;
  showTitle: boolean;
  contentWidth: ContentWidth;
  createdAt: string;
  createdByUsername: string | null;
  updatedAt: string | null;
  updatedByUsername: string | null;
}

/**
 * Lightweight list item for content overview screens.
 */
export interface ContentPageSummary {
  slug: string;
  title: string;
  status: ContentStatus;
  showTitle: boolean;
  contentWidth: ContentWidth;
  createdAt: string;
  createdByUsername: string | null;
  updatedAt: string | null;
  updatedByUsername: string | null;
}

/**
 * Supported navigation link targets.
 */
export type NavTarget = "_self" | "_blank";

/**
 * Navigation item representation for header/footer editors.
 */
export interface NavItem {
  id: number;
  navId: NavId;
  pageSlug: string | null;
  pageTitle: string | null;
  url: string | null;
  target: NavTarget;
  label: string | null;
  position: number;
}
