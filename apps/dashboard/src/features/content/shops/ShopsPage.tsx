import {
  EyeIcon,
  MagnifyingGlassIcon,
  PauseCircleIcon,
  PlusCircleIcon,
  SquaresFourIcon,
  StorefrontIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import type { ShopVisibility } from "@lmaa/shared";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAdminCategories } from "@/features/content/hooks/useAdminCategories.ts";
import { useAdminShops } from "@/features/content/hooks/useAdminShops.ts";
import { ShopTable } from "@/features/content/shops/ShopTable.tsx";

type VisibilityFilter = "all" | ShopVisibility;

/**
 * Shop management route with filters and moderation actions.
 *
 * @returns Shops administration page.
 */
export function ShopsPage() {
  const { messages } = useI18n();
  const shopsMessages = messages.shops;
  const navigate = useNavigate();
  useAdminCategories();
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");

  const { data: shops = [], isLoading } = useAdminShops(
    visibilityFilter === "all" ? undefined : visibilityFilter,
  );

  const searchLower = search.toLowerCase();
  const filtered = useMemo(
    () =>
      shops.filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) || s.url.toLowerCase().includes(searchLower),
      ),
    [shops, searchLower],
  );

  const filterOptions = useMemo<DropdownOption<VisibilityFilter>[]>(
    () => [
      {
        value: "all",
        label: shopsMessages.filters.all,
        icon: <SquaresFourIcon weight="duotone" className="w-3.5 h-3.5" />,
      },
      {
        value: "public",
        label: shopsMessages.filters.public,
        icon: <EyeIcon weight="duotone" className="w-3.5 h-3.5" />,
      },
      {
        value: "onhold",
        label: shopsMessages.filters.onhold,
        icon: <PauseCircleIcon weight="duotone" className="w-3.5 h-3.5" />,
      },
      {
        value: "deleted",
        label: shopsMessages.filters.deleted,
        icon: <TrashIcon weight="duotone" className="w-3.5 h-3.5" />,
      },
      {
        value: "rejected",
        label: shopsMessages.filters.rejected,
        icon: <XCircleIcon weight="duotone" className="w-3.5 h-3.5" />,
      },
    ],
    [shopsMessages],
  );

  return (
    <PageLayout>
      <PageHeader title={shopsMessages.title}>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={shopsMessages.searchPlaceholder}
            className="py-1.5 w-52 px-3 border border-[var(--ds-border)] rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] pr-7"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)]"
            >
              <XCircleIcon weight="duotone" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Dropdown value={visibilityFilter} onChange={setVisibilityFilter} options={filterOptions} />

        <button
          type="button"
          onClick={() => navigate("/shops/new")}
          className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors"
        >
          <PlusCircleIcon weight="duotone" className="w-3.5 h-3.5" />
          {shopsMessages.newShop}
        </button>
      </PageHeader>

      <PageBody>
        {isLoading && (
          <div className="space-y-px">
            {Array.from({ length: 8 }, (_, i) => `sk-${i}`).map((key) => (
              <div
                key={key}
                className="h-14 bg-[var(--ds-surface)] animate-pulse border-b border-[var(--ds-border-subtle)]"
              />
            ))}
          </div>
        )}

        {!isLoading && shops.length === 0 && (
          <ContentUnavailableView
            icon={<StorefrontIcon weight="duotone" aria-hidden />}
            title={shopsMessages.noShops}
            subtitle={shopsMessages.noShopsHint}
            className="flex-1 min-h-0"
          />
        )}

        {!isLoading && shops.length > 0 && filtered.length === 0 && (
          <ContentUnavailableView
            icon={<MagnifyingGlassIcon weight="duotone" aria-hidden />}
            title={`${shopsMessages.noResultsPrefix} „${search}".`}
            subtitle={shopsMessages.noResultsHint}
            className="flex-1 min-h-0"
          />
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="-mx-3 -mt-3">
            <ShopTable shops={filtered} onEdit={(shop) => navigate(`/shops/${shop.id}`)} />
          </div>
        )}
      </PageBody>
    </PageLayout>
  );
}
