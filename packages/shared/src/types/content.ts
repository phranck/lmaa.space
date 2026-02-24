export type ContentStatus = "draft" | "published" | "hidden";
export type NavId = "header" | "footer";

export interface ContentPage {
  slug: string;
  title: string;
  content: string;
  status: ContentStatus;
  createdAt: string;
  createdByUsername: string | null;
  updatedAt: string | null;
  updatedByUsername: string | null;
}

export interface ContentPageSummary {
  slug: string;
  title: string;
  status: ContentStatus;
  createdAt: string;
  createdByUsername: string | null;
  updatedAt: string | null;
  updatedByUsername: string | null;
}

export interface NavItem {
  id: number;
  navId: NavId;
  pageSlug: string;
  pageTitle: string;
  label: string | null;
  position: number;
}
