import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useContentPages,
  useCreateContentPage,
  useDeleteContentPage,
} from "@/features/content/hooks/useAdminContent.ts";
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  SFCheckmarkCircleFill,
  SFCircle,
  SFEyeSlashFill,
  SFPlusCircleFill,
  SFTrashFill,
} from "sf-symbols-lib/monochrome";

const PAGE_LIST_TEXT = {
  de: {
    title: "Seiten",
    newPage: "Neue Seite",
    createTitle: "Neue Seite erstellen",
    fieldTitle: "Titel",
    fieldSlug: "Slug (URL-Pfad)",
    titlePlaceholder: "z.B. Über uns",
    slugPlaceholder: "about",
    create: "Erstellen",
    creating: "Wird erstellt…",
    cancel: "Abbrechen",
    createError: "Fehler beim Erstellen",
    confirmDelete: "Seite",
    confirmDeleteSuffix: "wirklich löschen?",
    loadPages: "Lade Seiten…",
    emptyPages: "Noch keine Seiten vorhanden.",
    table: {
      title: "Titel",
      slug: "Slug",
      status: "Status",
      createdBy: "Erstellt von",
      updatedBy: "Geändert von",
    },
    deletePageTitle: "Seite löschen",
    status: {
      published: "Veröffentlicht",
      hidden: "Versteckt",
      draft: "Entwurf",
    },
  },
  en: {
    title: "Pages",
    newPage: "New page",
    createTitle: "Create new page",
    fieldTitle: "Title",
    fieldSlug: "Slug (URL path)",
    titlePlaceholder: "e.g. About us",
    slugPlaceholder: "about-us",
    create: "Create",
    creating: "Creating…",
    cancel: "Cancel",
    createError: "Error while creating",
    confirmDelete: "Delete page",
    confirmDeleteSuffix: "for sure?",
    loadPages: "Loading pages…",
    emptyPages: "No pages available yet.",
    table: {
      title: "Title",
      slug: "Slug",
      status: "Status",
      createdBy: "Created by",
      updatedBy: "Updated by",
    },
    deletePageTitle: "Delete page",
    status: {
      published: "Published",
      hidden: "Hidden",
      draft: "Draft",
    },
  },
} as const;

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
  const { locale } = useI18n();
  const text = PAGE_LIST_TEXT[locale];
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <SFCheckmarkCircleFill className="w-3.5 h-3.5" />
        {text.status.published}
      </span>
    );
  }
  if (status === "hidden") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--ds-text-muted)]">
        <SFEyeSlashFill className="w-3.5 h-3.5" />
        {text.status.hidden}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
      <SFCircle className="w-3.5 h-3.5" />
      {text.status.draft}
    </span>
  );
}

/**
 * Content pages overview with create/delete navigation actions.
 *
 * @returns Content list route component.
 */
export function PagesListPage() {
  const { locale } = useI18n();
  const text = PAGE_LIST_TEXT[locale];
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
      navigate(`/seiten/${page.slug}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : text.createError);
    }
  }

  function handleCancelCreate() {
    setShowCreate(false);
    setTitle("");
    setSlug("");
    setSlugManual(false);
    setCreateError(null);
  }

  async function handleDelete(slug: string, title: string) {
    if (!confirm(`${text.confirmDelete} "${title}" ${text.confirmDeleteSuffix}`)) return;
    await deletePage.mutateAsync(slug);
  }

  return (
    <>
      <PageHeader title={text.title}>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--ds-btn-primary-bg)] text-[var(--ds-btn-primary-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] transition-colors"
          >
            <SFPlusCircleFill className="w-3.5 h-3.5" />
            {text.newPage}
          </button>
        )}
      </PageHeader>

      <div className="p-6 space-y-6">
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
                  className="w-full px-3 py-2 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
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
                    className="flex-1 px-3 py-2 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent font-mono"
                  />
                </div>
              </div>
            </div>
            {createError && <p className="text-xs text-red-500">{createError}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={createPage.isPending || !slug || !title}
                className="px-4 py-2 bg-[var(--ds-btn-primary-bg)] text-[var(--ds-btn-primary-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] disabled:opacity-60 transition-colors"
              >
                {createPage.isPending ? text.creating : text.create}
              </button>
              <button
                type="button"
                onClick={handleCancelCreate}
                className="px-4 py-2 text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
              >
                {text.cancel}
              </button>
            </div>
          </form>
        )}

        <div className="bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-control overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-[var(--ds-text-muted)] text-sm">
              {text.loadPages}
            </div>
          ) : pages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[var(--ds-text-muted)] text-sm">
              {text.emptyPages}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--ds-border)] text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">
                  <th className="text-left px-4 py-3">{text.table.title}</th>
                  <th className="text-left px-4 py-3">{text.table.slug}</th>
                  <th className="text-left px-4 py-3">{text.table.status}</th>
                  <th className="text-left px-4 py-3">{text.table.createdBy}</th>
                  <th className="text-left px-4 py-3">{text.table.updatedBy}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr
                    key={page.slug}
                    className="border-b border-[var(--ds-border)] last:border-0 hover:bg-[var(--ds-surface-hover)] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--ds-text)]">
                      <button
                        type="button"
                        onClick={() => navigate(`/seiten/${page.slug}`)}
                        className="hover:underline text-left"
                      >
                        {page.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--ds-text-muted)]">
                      /{page.slug}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={page.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--ds-text-muted)]">
                      {page.createdByUsername ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--ds-text-muted)]">
                      {page.updatedByUsername ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(page.slug, page.title)}
                        disabled={deletePage.isPending}
                        className="p-1.5 text-[var(--ds-text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors disabled:opacity-40"
                        title={text.deletePageTitle}
                      >
                        <SFTrashFill className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
