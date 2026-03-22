import {
  CheckCircleIcon,
  CircleIcon,
  EyeSlashIcon,
  FileIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import type { ColumnDef } from "@/components/ui/Table.tsx";
import { DataTable } from "@/components/ui/Table.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useContentPages,
  useCreateContentPage,
  useDeleteContentPage,
} from "@/features/content/hooks/useAdminContent.ts";

interface ContentPage {
  slug: string;
  title: string;
  status: string;
  createdByUsername: string | null;
  updatedAt: string | null;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function StatusBadge({ status }: { status: string }) {
  const { messages } = useI18n();
  const s = messages.content.pages.status;
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <CheckCircleIcon weight="duotone" className="w-3.5 h-3.5" />
        {s.published}
      </span>
    );
  }
  if (status === "hidden") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--ds-text-muted)]">
        <EyeSlashIcon weight="duotone" className="w-3.5 h-3.5" />
        {s.hidden}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
      <CircleIcon weight="duotone" className="w-3.5 h-3.5" />
      {s.draft}
    </span>
  );
}

function formatDate(isoDate: string | null, locale: string): string {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Content pages overview with create/delete navigation actions.
 *
 * @returns Content list route component.
 */
export function PagesListPage() {
  const { locale, messages } = useI18n();
  const text = messages.content.pages;
  const cancel = messages.common.cancel;
  const { data: pages = [], isLoading } = useContentPages();
  const createPage = useCreateContentPage();
  const deletePage = useDeleteContentPage();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slugManual) {
      setSlug(slugify(val));
    }
  }

  function handleSlugChange(val: string) {
    setSlug(val);
    setSlugManual(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    try {
      const page = await createPage.mutateAsync({ slug, title, status: "draft" });
      setShowCreate(false);
      setTitle("");
      setSlug("");
      setSlugManual(false);
      navigate(`/pages/${page.slug}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : (text.createError ?? ""));
    }
  }

  function handleCancelCreate() {
    setShowCreate(false);
    setTitle("");
    setSlug("");
    setSlugManual(false);
    setCreateError(null);
  }

  async function handleDelete(pageSlug: string, pageTitle: string) {
    if (!confirm(`${text.confirmDeletePrefix}${pageTitle}${text.confirmDeleteSuffix}`)) return;
    await deletePage.mutateAsync(pageSlug);
  }

  const columns = useMemo<ColumnDef<ContentPage>[]>(
    () => [
      {
        id: "title",
        header: text.table.title,
        sortKey: (page) => page.title.toLowerCase(),
        cell: (page) => (
          <button
            type="button"
            onClick={() => navigate(`/pages/${page.slug}`)}
            className="font-medium text-[var(--ds-text)] hover:underline text-left truncate"
          >
            {page.title}
          </button>
        ),
      },
      {
        id: "slug",
        header: text.table.slug,
        cell: (page) => (
          <span className="font-mono text-xs text-[var(--ds-text-muted)]">/{page.slug}</span>
        ),
      },
      {
        id: "status",
        header: text.table.status,
        cell: (page) => <StatusBadge status={page.status} />,
      },
      {
        id: "createdBy",
        header: text.table.createdBy,
        cell: (page) => (
          <span className="text-xs text-[var(--ds-text-muted)]">
            {page.createdByUsername ?? "—"}
          </span>
        ),
      },
      {
        id: "updatedAt",
        header: text.table.updatedAt,
        sortKey: (page) => page.updatedAt ?? "",
        cell: (page) => (
          <span className="text-xs text-[var(--ds-text-muted)]">
            {formatDate(page.updatedAt, locale)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        className: "w-12",
        cell: (page) => (
          <button
            type="button"
            onClick={() => handleDelete(page.slug, page.title)}
            disabled={deletePage.isPending}
            className="p-1.5 text-[var(--ds-text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors disabled:opacity-40"
            title={text.deletePageTitle}
          >
            <TrashIcon weight="duotone" className="w-4 h-4" />
          </button>
        ),
      },
    ],
    [text, locale, navigate, deletePage.isPending],
  );

  return (
    <PageLayout>
      <PageHeader title={text.title}>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors"
          >
            <PlusCircleIcon weight="duotone" className="w-3.5 h-3.5" />
            {text.newPage}
          </button>
        )}
      </PageHeader>

      <PageBody>
        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-control p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold text-[var(--ds-text)]">{text.createTitle}</h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="content-page-title"
                  className="block text-xs font-medium text-[var(--ds-text-muted)] mb-1"
                >
                  {text.fieldTitle}
                </label>
                <input
                  id="content-page-title"
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                  placeholder={text.titlePlaceholder}
                  className="w-full px-3 py-1.5 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="content-page-slug"
                  className="block text-xs font-medium text-[var(--ds-text-muted)] mb-1"
                >
                  {text.fieldSlug}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--ds-text-muted)] shrink-0">/</span>
                  <input
                    id="content-page-slug"
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    required
                    pattern="[a-z0-9-]+"
                    placeholder={text.slugPlaceholder}
                    className="flex-1 px-3 py-1.5 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent font-mono"
                  />
                </div>
              </div>
            </div>
            {createError && <p className="text-xs text-red-500">{createError}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={createPage.isPending || !slug || !title}
                className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-60 transition-colors"
              >
                <PlusCircleIcon weight="duotone" className="w-3.5 h-3.5" />
                {createPage.isPending ? text.creating : text.create}
              </button>
              <button
                type="button"
                onClick={handleCancelCreate}
                className="px-4 py-1.5 text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
              >
                {cancel}
              </button>
            </div>
          </form>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-32 text-[var(--ds-text-muted)] text-sm">
            {text.loadPages}
          </div>
        )}

        {!isLoading && pages.length === 0 && (
          <ContentUnavailableView
            className="flex-1 min-h-0"
            icon={<FileIcon weight="duotone" aria-hidden />}
            title={text.emptyPages}
            subtitle={text.emptyPagesHint}
          />
        )}

        {!isLoading && pages.length > 0 && (
          <div className="-mx-3 -mt-3">
            <DataTable
              columns={columns}
              data={pages}
              getRowKey={(page) => page.slug}
              stickyHeader
            />
          </div>
        )}
      </PageBody>
    </PageLayout>
  );
}
