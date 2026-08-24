import {
  CheckCircleIcon,
  CircleIcon,
  EyeSlashIcon,
  FileIcon,
  FileTextIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useMemo, useReducer } from "react";
import { useNavigate } from "react-router";

import { formatDate, slugify } from "@lmaa/shared";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  CancelActionButton,
  CreateActionButton,
  DeleteActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { DashboardInput } from "@/components/ui/DashboardControls.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import type { ColumnDef } from "@/components/ui/Table.tsx";
import { DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useContentPages,
  useCreateContentPage,
  useDeleteContentPage,
} from "@/features/content/hooks/useAdminContent.ts";
import type { DashboardLocale } from "@/i18n/messages.ts";

interface ContentPage {
  slug: string;
  title: string;
  status: string;
  createdByUsername: string | null;
  updatedAt: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const { messages } = useI18n();
  const s = messages.content.pages.status;
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <CheckCircleIcon weight="duotone" className="size-3.5" />
        {s.published}
      </span>
    );
  }
  if (status === "hidden") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--ds-text-muted)]">
        <EyeSlashIcon weight="duotone" className="size-3.5" />
        {s.hidden}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
      <CircleIcon weight="duotone" className="size-3.5" />
      {s.draft}
    </span>
  );
}

/** Shown where a page carries no readable date. */
const NO_DATE = "—";

function formatUpdatedAt(isoDate: string | null, locale: DashboardLocale): string {
  if (!isoDate) return NO_DATE;
  return formatDate(isoDate, locale) || NO_DATE;
}

/**
 * Content pages overview with create/delete navigation actions.
 *
 * @returns Content list route component.
 */
export function PagesListPage() {
  const { locale, messages } = useI18n();
  const text = messages.content.pages;
  const common = messages.common;
  const { data: pages = [], isLoading } = useContentPages();
  const createPage = useCreateContentPage();
  const deletePage = useDeleteContentPage();
  const navigate = useNavigate();

  interface PagesListState {
    showCreate: boolean;
    title: string;
    slug: string;
    slugManual: boolean;
    createError: string | null;
    deleteTarget: { slug: string; title: string } | null;
  }

  const [state, dispatch] = useReducer(
    (prev: PagesListState, action: Partial<PagesListState>): PagesListState => ({
      ...prev,
      ...action,
    }),
    {
      showCreate: false,
      title: "",
      slug: "",
      slugManual: false,
      createError: null,
      deleteTarget: null,
    },
  );
  const { showCreate, title, slug, slugManual, createError, deleteTarget } = state;

  function handleTitleChange(val: string) {
    dispatch(slugManual ? { title: val } : { title: val, slug: slugify(val) });
  }

  function handleSlugChange(val: string) {
    dispatch({ slug: val, slugManual: true });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ createError: null });
    try {
      const page = await createPage.mutateAsync({ slug, title, status: "draft" });
      dispatch({ showCreate: false, title: "", slug: "", slugManual: false });
      navigate(`/pages/${page.slug}`);
    } catch (err) {
      dispatch({ createError: err instanceof Error ? err.message : (text.createError ?? "") });
    }
  }

  function handleCancelCreate() {
    dispatch({ showCreate: false, title: "", slug: "", slugManual: false, createError: null });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deletePage.mutate(deleteTarget.slug, {
      onSuccess: () => dispatch({ deleteTarget: null }),
    });
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
            {formatUpdatedAt(page.updatedAt, locale)}
          </span>
        ),
      },
      {
        id: "actions",
        className: "w-48",
        cell: (page) => (
          <div className="flex gap-2 justify-end">
            <TableActionButton
              onClick={() => navigate(`/pages/${page.slug}`)}
              icon={<FileTextIcon weight="duotone" className="size-3.5" />}
              label={common.edit}
            />
            <TableActionButton
              variant="danger"
              onClick={() => dispatch({ deleteTarget: { slug: page.slug, title: page.title } })}
              disabled={deletePage.isPending}
              icon={<TrashIcon weight="duotone" className="size-3.5" />}
              label={common.delete}
            />
          </div>
        ),
      },
    ],
    [common.delete, common.edit, text, locale, navigate, deletePage.isPending],
  );

  return (
    <PageLayout>
      <PageHeader title={text.title}>
        {!showCreate && (
          <CreateActionButton onClick={() => dispatch({ showCreate: true })} label={text.newPage} />
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
                <DashboardInput
                  id="content-page-title"
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                  placeholder={text.titlePlaceholder}
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
                  <DashboardInput
                    id="content-page-slug"
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    required
                    pattern="[a-z0-9-]+"
                    placeholder={text.slugPlaceholder}
                    className="min-w-0 flex-1 font-mono"
                  />
                </div>
              </div>
            </div>
            {createError && <p className="text-xs text-red-500">{createError}</p>}
            <div className="flex items-center gap-3">
              <CreateActionButton
                type="submit"
                disabled={createPage.isPending || !slug || !title}
                busy={createPage.isPending}
                label={createPage.isPending ? text.creating : text.create}
              />
              <CancelActionButton onClick={handleCancelCreate} label={common.cancel} />
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
            chromeless
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

      {deleteTarget !== null && (
        <OverlayCard
          open={deleteTarget !== null}
          onClose={() => dispatch({ deleteTarget: null })}
          size={{ storageKey: "pages:delete-size", defaultWidth: 480 }}
          aria-label={text.deletePageTitle}
        >
          <OverlayCard.Header>
            <div className="flex items-center gap-3">
              <TrashIcon weight="duotone" className={dialogHeaderIconClass} />
              <h3 className="font-semibold text-[var(--ds-text)]">{text.deletePageTitle}</h3>
            </div>
          </OverlayCard.Header>

          <OverlayCard.Body>
            <p className="text-sm text-[var(--ds-text-muted)]">
              {text.confirmDeleteDescription}{" "}
              <span className="font-medium">{deleteTarget.title}</span>
            </p>
          </OverlayCard.Body>

          <OverlayCard.Footer className="flex justify-end gap-3">
            <CancelActionButton
              onClick={() => dispatch({ deleteTarget: null })}
              label={common.cancel}
            />
            <DeleteActionButton
              disabled={deletePage.isPending}
              onClick={handleDeleteConfirm}
              label={deletePage.isPending ? "…" : common.delete}
            />
          </OverlayCard.Footer>
        </OverlayCard>
      )}
    </PageLayout>
  );
}
