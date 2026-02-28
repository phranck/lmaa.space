import { useI18n } from "@/context/I18nContext.tsx";
import { useAdminCategories } from "@/features/categories/hooks/useAdminCategories.ts";
import { useContentPages } from "@/features/content/hooks/useAdminContent.ts";
import { useFormConfigs } from "@/features/form-builder/hooks/useFormConfig.ts";
import { insertMarkdown$, usePublisher } from "@mdxeditor/editor";
import { useRef, useState } from "react";
import { SFLink } from "sf-symbols-lib/monochrome";

interface LinkEntry {
  label: string;
  path: string;
  group: string;
}

/**
 * Helper dialog for inserting internal content links into Markdown.
 *
 * @returns Link picker component.
 */
export function InternalLinkPicker() {
  const { messages } = useI18n();
  const linkPickerMessages = messages.content.linkPicker;
  const insertMarkdown = usePublisher(insertMarkdown$);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: pages = [] } = useContentPages();
  const { data: categories = [] } = useAdminCategories();
  const { data: forms = [] } = useFormConfigs();
  const staticRoutes: LinkEntry[] = [
    {
      label: linkPickerMessages.staticRoutes.homeCategories,
      path: "/",
      group: linkPickerMessages.groups.static,
    },
    {
      label: linkPickerMessages.staticRoutes.suggestShop,
      path: "/suggestion",
      group: linkPickerMessages.groups.static,
    },
    {
      label: linkPickerMessages.staticRoutes.search,
      path: "/suche",
      group: linkPickerMessages.groups.static,
    },
  ];

  const entries: LinkEntry[] = [
    ...staticRoutes,
    ...pages
      .filter((p) => p.status === "published")
      .map((p) => ({ label: p.title, path: `/${p.slug}`, group: linkPickerMessages.groups.pages })),
    ...categories.map((c) => ({
      label: c.name,
      path: `/kategorien/${c.slug}`,
      group: linkPickerMessages.groups.categories,
    })),
    ...forms
      .filter((f) => f.slug != null)
      .map((f) => ({
        label: f.name,
        path: `/${f.slug}`,
        group: linkPickerMessages.groups.forms,
      })),
  ];

  const filtered = search.trim()
    ? entries.filter(
        (e) =>
          e.label.toLowerCase().includes(search.toLowerCase()) ||
          e.path.toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  function handleSelect(entry: LinkEntry) {
    insertMarkdown(`[${entry.label}](${entry.path})`);
    setOpen(false);
    setSearch("");
  }

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const grouped = filtered.reduce<Record<string, LinkEntry[]>>((acc, e) => {
    if (!acc[e.group]) acc[e.group] = [];
    acc[e.group].push(e);
    return acc;
  }, {});

  return (
    <div className="relative">
      <button
        type="button"
        title={linkPickerMessages.insertInternalLink}
        onClick={handleOpen}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-[var(--ds-surface-hover)] transition-colors text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
      >
        <SFLink className="w-4 h-4" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label={linkPickerMessages.closeSelection}
            className="fixed inset-0 z-40"
            onClick={() => {
              setOpen(false);
              setSearch("");
            }}
          />
          {/* Dropdown */}
          <div className="absolute top-8 left-0 z-50 w-80 bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-control shadow-lg overflow-hidden">
            <div className="p-2 border-b border-[var(--ds-border)]">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={linkPickerMessages.searchPlaceholder}
                className="w-full px-3 py-1.5 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div className="max-h-72 overflow-y-auto">
              {Object.keys(grouped).length === 0 ? (
                <div className="px-3 py-4 text-xs text-[var(--ds-text-muted)] text-center">
                  {linkPickerMessages.noResults}
                </div>
              ) : (
                Object.entries(grouped).map(([group, items]) => (
                  <div key={group}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ds-text-muted)] bg-[var(--ds-surface-hover)]">
                      {group}
                    </div>
                    {items.map((entry) => (
                      <button
                        key={entry.path}
                        type="button"
                        onClick={() => handleSelect(entry)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--ds-nav-hover-bg)] transition-colors flex items-baseline gap-2"
                      >
                        <span className="text-[var(--ds-text)] font-medium truncate flex-1">
                          {entry.label}
                        </span>
                        <span className="text-[var(--ds-text-muted)] font-mono text-xs shrink-0">
                          {entry.path}
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
