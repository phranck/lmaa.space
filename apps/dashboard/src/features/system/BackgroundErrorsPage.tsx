import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { DashboardCombobox, DashboardInput } from "@/components/ui/DashboardControls.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { DataTable, type ColumnDef } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  type BackgroundErrorRow,
  useBackgroundErrors,
  useResolveBackgroundError,
} from "@/features/system/hooks/useBackgroundErrors.ts";

export function BackgroundErrorsPage() {
  const { messages, locale } = useI18n();
  const t = messages.system.backgroundErrors;

  const [sourceFilter, setSourceFilter] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState<"all" | "unresolved" | "resolved">("all");

  const resolved =
    resolvedFilter === "all" ? undefined : resolvedFilter === "resolved" ? true : false;

  const { data: rows = [], isLoading } = useBackgroundErrors({
    resolved,
    source: sourceFilter.trim() || undefined,
  });

  const resolve = useResolveBackgroundError();

  const columns: ColumnDef<BackgroundErrorRow>[] = [
    {
      id: "source",
      header: t.columnSource,
      cell: (row) => (
        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[var(--ds-surface-hover)] text-[var(--ds-text)]">
          {row.source}
        </span>
      ),
      sortKey: (row) => row.source,
    },
    {
      id: "message",
      header: t.columnMessage,
      cell: (row) => <BackgroundErrorMessageCell row={row} locale={locale} />,
      cellClassName: "min-w-[28rem]",
    },
    {
      id: "occurredAt",
      header: t.columnOccurredAt,
      cell: (row) => (
        <span
          className="text-sm text-[var(--ds-text-muted)] whitespace-nowrap"
          suppressHydrationWarning
        >
          {new Date(row.occurredAt).toLocaleString(locale)}
        </span>
      ),
      sortKey: (row) => row.occurredAt,
    },
    {
      id: "status",
      header: t.columnStatus,
      cell: (row) =>
        row.resolvedAt ? (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--ds-text-success,var(--ds-text-muted))]">
            <CheckCircleIcon weight="duotone" className="size-3.5" />
            {t.statusResolved}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-500">
            <WarningCircleIcon weight="duotone" className="size-3.5" />
            {t.statusOpen}
          </span>
        ),
      sortKey: (row) => (row.resolvedAt ? 1 : 0),
    },
    {
      id: "actions",
      header: "",
      cell: (row) =>
        row.resolvedAt ? null : (
          <div className="flex justify-end">
            <TableActionButton
              variant="success"
              icon={<CheckCircleIcon weight="duotone" className="size-3.5" />}
              label={t.resolveAction}
              disabled={resolve.isPending}
              onClick={() => resolve.mutate(row.id)}
            />
          </div>
        ),
      cellClassName: "w-32",
    },
  ];

  return (
    <PageLayout>
      <PageHeader title={t.title} />
      <PageBody className="p-4 gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <DashboardInput
            type="text"
            placeholder={t.filterSourcePlaceholder}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          />
          <DashboardCombobox
            value={resolvedFilter}
            onValueChange={(value) => setResolvedFilter(value as typeof resolvedFilter)}
            className="w-40"
            options={[
              { value: "all", label: t.filterAll },
              { value: "unresolved", label: t.filterUnresolved },
              { value: "resolved", label: t.filterResolved },
            ]}
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-[var(--ds-text-muted)]">{messages.common.loading}</p>
        ) : rows.length === 0 ? (
          <ContentUnavailableView
            icon={<CheckCircleIcon weight="duotone" className="size-8" />}
            title={t.noErrors}
            subtitle={t.noErrorsSubtitle}
          />
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            getRowKey={(row) => row.id}
            initialSort={{ id: "occurredAt", dir: "desc" }}
          />
        )}
      </PageBody>
    </PageLayout>
  );
}

function BackgroundErrorMessageCell({ row, locale }: { row: BackgroundErrorRow; locale: string }) {
  const message = formatBackgroundErrorMessage(row.message, locale);
  const details = getBackgroundErrorDetails(row.context, locale);

  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-sm leading-5 text-[var(--ds-text)] break-words">{message}</p>
      {details.length > 0 ? (
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs leading-5 text-[var(--ds-text-muted)]">
          {details.map((detail) => (
            <div key={detail.key} className="contents">
              <dt className="font-medium text-[var(--ds-text-subtle)]">{detail.label}</dt>
              <dd className="min-w-0 break-words text-[var(--ds-text-muted)]">{detail.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

interface BackgroundErrorDetail {
  key: string;
  label: string;
  value: string;
}

const BACKGROUND_ERROR_DETAIL_LABELS = {
  de: {
    accountId: "Account-ID",
    categoryId: "Kategorie-ID",
    code: "Code",
    "error.code": "Provider-Code",
    "error.message": "Provider-Meldung",
    "error.name": "Provider-Fehler",
    "error.status": "Provider-Status",
    "error.statusCode": "Provider-Status",
    "error.status_code": "Provider-Status",
    errorDetails: "Fehlerdetails",
    message: "Meldung",
    name: "Fehlertyp",
    platform: "Plattform",
    status: "Status",
    statusCode: "Status",
    status_code: "Status",
    subject: "Betreff",
    submissionId: "Submission-ID",
    templateId: "Template-ID",
    to: "Empfänger",
  },
  en: {
    accountId: "Account ID",
    categoryId: "Category ID",
    code: "Code",
    "error.code": "Provider code",
    "error.message": "Provider message",
    "error.name": "Provider error",
    "error.status": "Provider status",
    "error.statusCode": "Provider status",
    "error.status_code": "Provider status",
    errorDetails: "Error details",
    message: "Message",
    name: "Error type",
    platform: "Platform",
    status: "Status",
    statusCode: "Status",
    status_code: "Status",
    subject: "Subject",
    submissionId: "Submission ID",
    templateId: "Template ID",
    to: "Recipient",
  },
} as const;

const BACKGROUND_ERROR_DETAIL_ORDER = [
  "to",
  "subject",
  "templateId",
  "submissionId",
  "accountId",
  "categoryId",
  "platform",
  "error.name",
  "error.message",
  "error.code",
  "error.statusCode",
  "error.status",
  "error.status_code",
];

const BACKGROUND_ERROR_DETAIL_ORDER_INDEX = new Map(
  BACKGROUND_ERROR_DETAIL_ORDER.map((key, index) => [key, index]),
);

function formatBackgroundErrorMessage(message: string, locale: string): string {
  if (message !== "[object Object]") return message;
  return locale === "de"
    ? "Strukturierter Fehler ohne gespeicherte Klartextmeldung."
    : "Structured error without a stored plain-text message.";
}

function getBackgroundErrorDetails(
  context: Record<string, unknown> | null,
  locale: string,
): BackgroundErrorDetail[] {
  if (!context) return [];

  return flattenBackgroundErrorDetails(context)
    .sort((a, b) => {
      const aIndex = BACKGROUND_ERROR_DETAIL_ORDER_INDEX.get(a.key) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = BACKGROUND_ERROR_DETAIL_ORDER_INDEX.get(b.key) ?? Number.MAX_SAFE_INTEGER;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.key.localeCompare(b.key);
    })
    .map(({ key, value }) => ({
      key,
      label: getBackgroundErrorDetailLabel(key, locale),
      value: formatBackgroundErrorDetailValue(value),
    }));
}

function flattenBackgroundErrorDetails(
  value: Record<string, unknown>,
  prefix = "",
): Array<{ key: string; value: unknown }> {
  return Object.entries(value).flatMap(([key, entryValue]) => {
    const detailKey = prefix ? `${prefix}.${key}` : key;
    if (entryValue == null || entryValue === "") return [];
    if (isPlainRecord(entryValue) && Object.keys(entryValue).length > 0) {
      return flattenBackgroundErrorDetails(entryValue, detailKey);
    }
    return [{ key: detailKey, value: entryValue }];
  });
}

function getBackgroundErrorDetailLabel(key: string, locale: string): string {
  const labels =
    locale === "de" ? BACKGROUND_ERROR_DETAIL_LABELS.de : BACKGROUND_ERROR_DETAIL_LABELS.en;
  return labels[key as keyof typeof labels] ?? humanizeBackgroundErrorDetailKey(key);
}

function humanizeBackgroundErrorDetailKey(key: string): string {
  return key
    .split(".")
    .map((part) =>
      part
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    )
    .join(" / ");
}

function formatBackgroundErrorDetailValue(value: unknown): string {
  let formatted: string;
  if (Array.isArray(value)) {
    formatted = value.map((item) => formatBackgroundErrorDetailValue(item)).join(", ");
  } else if (typeof value === "string") {
    formatted = value;
  } else if (typeof value === "number" || typeof value === "boolean") {
    formatted = String(value);
  } else {
    formatted = JSON.stringify(value) ?? String(value);
  }

  if (formatted.length <= 220) return formatted;
  return `${formatted.slice(0, 219)}…`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
