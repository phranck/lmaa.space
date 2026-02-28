import { Card } from "@/components/ui/Card.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useCreateFormConfig,
  useDeleteFormConfig,
  useFormConfigs,
} from "@/features/form-builder/hooks/useFormConfig.ts";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  SFCheckmarkCircleFill,
  SFCircle,
  SFNewspaperFill,
  SFPlusCircleFill,
  SFTrashFill,
} from "sf-symbols-lib/monochrome";

/**
 * Derives a slug from a name: lowercase, replace spaces/underscores with hyphens,
 * remove all characters that aren't alphanumeric or hyphens.
 */
function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <SFCheckmarkCircleFill className="w-3.5 h-3.5" />
        Aktiv
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--ds-text-muted)]">
      <SFCircle className="w-3.5 h-3.5" />
      Inaktiv
    </span>
  );
}

/**
 * Dialog for creating a new form configuration.
 */
function NewFormDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const { messages } = useI18n();
  const m = messages.formBuilder;
  const createMutation = useCreateFormConfig();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Auto-derive slug from name unless user has manually edited it
  useEffect(() => {
    if (!slugEdited) {
      setSlug(deriveSlug(name));
    }
  }, [name, slugEdited]);

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setError(null);

    createMutation.mutate(
      { name: name.trim(), slug: slug.trim() },
      {
        onSuccess: () => {
          onCreated(name.trim());
        },
        onError: (err: unknown) => {
          const status =
            err && typeof err === "object" && "status" in err
              ? (err as { status: number }).status
              : 0;
          if (status === 409) {
            const msg =
              err && typeof err === "object" && "responseMessage" in err
                ? String((err as { responseMessage: string }).responseMessage)
                : "";
            if (msg.toLowerCase().includes("slug")) {
              setError(m.slugConflict);
            } else {
              setError(m.nameConflict);
            }
          } else {
            setError(messages.common.unknownError);
          }
        },
      },
    );
  }

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label={messages.common.close}
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-control shadow-xl p-6">
          <h2 className="text-base font-semibold text-[var(--ds-text)] mb-4">{m.newForm}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="new-form-name"
                className="block text-xs font-medium text-[var(--ds-text-muted)] mb-1"
              >
                {m.formNameLabel}
              </label>
              <input
                id="new-form-name"
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="suggestion-form"
                className="w-full px-3 py-2 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="new-form-slug"
                className="block text-xs font-medium text-[var(--ds-text-muted)] mb-1"
              >
                {m.formSlugLabel}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--ds-text-muted)] shrink-0">/</span>
                <input
                  id="new-form-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder={m.slugPlaceholder}
                  className="flex-1 px-3 py-2 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent font-mono"
                />
              </div>
              <p className="text-xs text-[var(--ds-text-muted)] mt-1">{m.formSlugHint}</p>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={createMutation.isPending || !slug || !name}
                className="px-4 py-2 bg-[var(--ds-btn-primary-bg)] text-[var(--ds-btn-primary-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] disabled:opacity-60 transition-colors"
              >
                {createMutation.isPending ? messages.common.saving : m.create}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
              >
                {messages.common.cancel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

/**
 * Form builder list page showing all form configurations.
 *
 * @returns List page with table of forms and "New Form" button.
 */
export function FormBuilderListPage() {
  const { messages } = useI18n();
  const m = messages.formBuilder;
  const navigate = useNavigate();
  const { data: forms = [], isLoading } = useFormConfigs();
  const deleteForm = useDeleteFormConfig();
  const [showDialog, setShowDialog] = useState(false);

  async function handleDelete(name: string) {
    if (!confirm(`Formular "${name}" wirklich löschen?`)) return;
    await deleteForm.mutateAsync(name);
  }

  function handleCreated(name: string) {
    setShowDialog(false);
    void navigate(`/formular/${name}`);
  }

  return (
    <>
      <PageHeader title={m.listTitle}>
        <button
          type="button"
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--ds-btn-primary-bg)] text-[var(--ds-btn-primary-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] transition-colors"
        >
          <SFPlusCircleFill className="w-3.5 h-3.5" />
          {m.newForm}
        </button>
      </PageHeader>

      <div className="p-6 space-y-6">
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-[var(--ds-text-muted)] text-sm">
              {messages.common.loading}
            </div>
          ) : forms.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[var(--ds-text-muted)] text-sm">
              {m.noForms}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--ds-border)] text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">{m.slugLabel}</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => (
                  <tr
                    key={form.id}
                    className="border-b border-[var(--ds-border)] last:border-0 hover:bg-[var(--ds-surface-hover)] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--ds-text)]">
                      <button
                        type="button"
                        onClick={() => navigate(`/formular/${form.name}`)}
                        className="hover:underline text-left font-mono"
                      >
                        {form.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--ds-text-muted)]">
                      {form.slug ? `/${form.slug}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ActiveBadge isActive={form.isActive} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/formular/${form.name}`)}
                          className="p-1.5 text-[var(--ds-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--ds-surface-hover)] rounded transition-colors"
                          title={m.editButton}
                        >
                          <SFNewspaperFill className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(form.name)}
                          disabled={deleteForm.isPending}
                          className="p-1.5 text-[var(--ds-text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors disabled:opacity-40"
                          title={messages.common.delete}
                        >
                          <SFTrashFill className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {showDialog && (
        <NewFormDialog onClose={() => setShowDialog(false)} onCreated={handleCreated} />
      )}
    </>
  );
}
