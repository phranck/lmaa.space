import {
  ArrowSquareUpRightIcon,
  FileTextIcon,
  RobotIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { formatDateTime, type ReviewCost, type ReviewJobListItem } from "@lmaa/shared";

import { Badge } from "@/components/ui/Badge.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { SkeletonRows } from "@/components/ui/SkeletonRows.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useReviewJobs, useReviewSpend } from "@/features/overview/hooks/useReviewJob.ts";
import { reviewJobTarget } from "@/features/overview/review-job-target.ts";
import { VERDICT_COLORS } from "@/features/overview/verdict-colors.ts";

/** Nano-units per whole currency unit, matching the backend's counting. */
const NANO_PER_UNIT = 1_000_000_000;

/**
 * Columns the footer note spans, counted from the left.
 *
 * Three, which is everything before the summary labels. Any more would take
 * the column the labels sit in and push them away from their amounts.
 */
const FOOTER_LEAD_COLUMNS = 3;

/**
 * Reads an amount as a number of whole currency units.
 *
 * @param cost - The amount, or `null` when nothing has been costed yet.
 * @returns The amount, or `0` so a column can still be sorted by it.
 */
function costUnits(cost: ReviewCost | null): number {
  if (!cost) return 0;
  return Number(cost.displayTotalNano ?? cost.totalNano) / NANO_PER_UNIT;
}

/**
 * One amount, with a slot before it for the incompleteness marker.
 *
 * @param amount - The amount, already formatted.
 * @param incomplete - Whether a billable dimension was missing.
 * @param title - Explanation shown on hover when it is incomplete.
 * @param muted - Renders the amount in the muted colour, for summary rows.
 * @returns The cell contents.
 *
 * @remarks
 * The marker sits in a reserved column before the digits rather than after
 * them, so every amount ends at the same place whether it carries one or not.
 * Used by the rows and by the totals, which is what keeps the two aligned.
 */
function CostAmount({
  amount,
  incomplete = false,
  title,
  muted = false,
}: {
  amount: string;
  incomplete?: boolean;
  title?: string;
  muted?: boolean;
}) {
  return (
    <span
      className={`flex items-center justify-end gap-1.5 text-sm ${muted ? "text-[var(--ds-text-muted)]" : "text-[var(--ds-text)]"}`}
      title={title}
    >
      <span className="flex w-4 justify-end">
        {incomplete ? (
          <WarningCircleIcon weight="duotone" aria-hidden className="size-4 text-amber-400" />
        ) : null}
      </span>
      <span className="tabular-nums">{amount}</span>
    </span>
  );
}

/**
 * Lists every automated check with what it cost.
 *
 * @remarks
 * The amount comes from the backend already converted with the rate its rate
 * card pinned, so a finished check keeps the figure it was finalized with.
 * Incomplete amounts are marked rather than shown as a plain number, because a
 * bare figure gives a reader no way to tell that a billable dimension was
 * missing.
 */
export function AutomatedChecksTab() {
  const { locale, messages } = useI18n();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const t = messages.submissions.automatedChecks;
  const reviewMessages = messages.submissions.review;

  const { data: jobs = [], isLoading } = useReviewJobs();
  const { data: spend } = useReviewSpend();

  // The ledger, not the sum of the rows above: a check whose suggestion was
  // deleted is gone from the list and its spending is not.
  const totalUnits = spend ? costUnits(spend.total) : 0;
  const todayUnits = spend ? costUnits(spend.today) : 0;
  const averageUnits = spend ? costUnits(spend.average) : 0;
  const currency = spend?.total.displayCurrency ?? spend?.total.currency ?? "EUR";
  // The legend appears only where a marked amount does, so an explanation is
  // never offered for something that is not on screen.
  const hasIncomplete = jobs.some((job) => job.cost && !job.cost.complete);

  // Beside the totals rather than under the table, because it explains the
  // marker those amounts carry. Spanning the three columns left of the labels
  // keeps it clear of them whilst it wraps over the rows' full height.
  const footerLead = useMemo(
    () =>
      hasIncomplete
        ? {
            columnCount: FOOTER_LEAD_COLUMNS,
            node: (
              <p className="flex items-start gap-1.5 text-xs text-[var(--ds-text-subtle)]">
                <WarningCircleIcon
                  weight="duotone"
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-amber-400"
                />
                {t.costIncomplete}
              </p>
            ),
          }
        : undefined,
    [hasIncomplete, t.costIncomplete],
  );

  // Written into the cost column of the table rather than under it, so the
  // totals stand exactly beneath the amounts they add up.
  const footerRows = useMemo(() => {
    const format = (units: number) =>
      `${units.toLocaleString(locale, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${currency}`;

    // In the column immediately before the amounts rather than further left,
    // so a label stands beside the figure it names instead of across a gap.
    const label = (text: string) => (
      <span className="block truncate text-right text-sm text-[var(--ds-text-muted)]">{text}</span>
    );

    return [
      {
        id: "today",
        cells: {
          model: label(t.todayLabel),
          cost: <CostAmount amount={format(todayUnits)} incomplete={!spend?.today.complete} />,
        },
      },
      {
        id: "total",
        cells: {
          model: label(t.totalLabel),
          cost: <CostAmount amount={format(totalUnits)} incomplete={!spend?.total.complete} />,
        },
      },
      {
        id: "average",
        cells: {
          // The count belongs beside the label rather than in a column of its
          // own, because it is what makes the average readable: a mean over
          // three checks and one over three hundred are different claims.
          model: label(`${t.averageLabel} (${spend?.checkCount ?? 0})`),
          cost: <CostAmount amount={format(averageUnits)} incomplete={!spend?.average.complete} />,
        },
      },
    ];
  }, [
    averageUnits,
    currency,
    locale,
    spend,
    t.averageLabel,
    t.todayLabel,
    t.totalLabel,
    todayUnits,
    totalUnits,
  ]);

  const columns = useMemo<ColumnDef<ReviewJobListItem>[]>(
    () => [
      {
        id: "shop",
        header: t.columnShop,
        sortKey: (job) => job.shopName.toLowerCase(),
        cell: (job) => (
          <div className="min-w-0">
            <Link
              to={reviewJobTarget(job)}
              state={{ returnTo: `${pathname}${search}` }}
              className="block truncate font-medium text-[var(--ds-text)] hover:underline"
            >
              {job.shopName}
            </Link>
            {/* The address is the longest thing in the row and the one that
                would otherwise decide the table's width. It shortens, whilst
                the icon after it stays whole and stays put. */}
            <a
              href={job.shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
            >
              <span className="truncate">{job.shopUrl}</span>
              <ArrowSquareUpRightIcon weight="duotone" className="h-3 w-3 shrink-0" />
            </a>
          </div>
        ),
      },
      {
        id: "state",
        header: t.columnState,
        className: "w-40",
        sortKey: (job) => job.state,
        cell: (job) => (
          <span className="text-sm text-[var(--ds-text)]">{reviewMessages.states[job.state]}</span>
        ),
      },
      {
        id: "verdict",
        header: t.columnVerdict,
        className: "w-48",
        sortKey: (job) => job.verdict ?? "",
        // What a check recommended and what it did are different things to
        // read: the first is work waiting for somebody, the second is a record.
        // Where the automation applied the verdict itself, the row says so.
        // `onhold` is excluded because it is never applied: it is what happens
        // when nobody decides, so there is nothing to have done.
        cell: (job) =>
          job.verdict ? (
            <Badge colorClass={VERDICT_COLORS[job.verdict]}>
              {job.appliedByAutomation && job.verdict !== "onhold"
                ? reviewMessages.verdictsApplied[job.verdict]
                : reviewMessages.verdicts[job.verdict]}
            </Badge>
          ) : (
            <span className="text-sm text-[var(--ds-text-subtle)]">–</span>
          ),
      },
      {
        id: "model",
        header: t.columnModel,
        className: "w-44",
        sortKey: (job) => job.model ?? "",
        // A model identifier is one long token with no space to break at, so it
        // shortens rather than running past the column.
        cell: (job) => (
          <span
            className="block truncate text-xs text-[var(--ds-text-subtle)]"
            title={job.model ?? undefined}
          >
            {job.model ?? "–"}
          </span>
        ),
      },
      {
        id: "cost",
        header: t.columnCost,
        className: "w-40 text-right",
        sortKey: (job) => costUnits(job.cost),
        cell: (job) =>
          job.cost ? (
            <CostAmount
              amount={`${costUnits(job.cost).toLocaleString(locale, {
                minimumFractionDigits: 4,
                maximumFractionDigits: 4,
              })} ${job.cost.displayCurrency ?? job.cost.currency}`}
              incomplete={!job.cost.complete}
              title={job.cost.complete ? undefined : t.costIncomplete}
            />
          ) : (
            <CostAmount amount="–" muted />
          ),
      },
      {
        id: "finishedAt",
        header: t.columnFinished,
        className: "w-52",
        sortKey: (job) => (job.finishedAt ? new Date(job.finishedAt).getTime() : 0),
        cell: (job) =>
          job.finishedAt ? (
            <span className="text-xs text-[var(--ds-text-subtle)]">
              {formatDateTime(job.finishedAt, locale)}
            </span>
          ) : (
            <span className="text-xs text-[var(--ds-text-subtle)]">–</span>
          ),
      },
      {
        id: "actions",
        className: "w-36",
        cell: (job) => (
          <div className="flex justify-end">
            <TableActionButton
              onClick={() =>
                navigate(reviewJobTarget(job), {
                  state: { returnTo: `${pathname}${search}` },
                })
              }
              icon={<FileTextIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={messages.submissions.suggestions.edit}
            />
          </div>
        ),
      },
    ],
    [locale, messages, navigate, pathname, reviewMessages, search, t],
  );

  if (isLoading) {
    return (
      <div className="space-y-px">
        <SkeletonRows />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <ContentUnavailableView
        chromeless
        className="flex-1"
        icon={<RobotIcon weight="duotone" aria-hidden />}
        title={t.emptyTitle}
        subtitle={t.emptyHint}
      />
    );
  }

  return (
    // Pulled over the scroll container's padding on every side, so the sticky
    // footer can reach the bottom edge rather than stopping short of it.
    <div className="-mx-3 -mt-3 -mb-3">
      <DataTable
        columns={columns}
        data={jobs}
        getRowKey={(job) => job.id}
        stickyHeader
        stickyFooter
        footerRows={footerRows}
        footerLead={footerLead}
      />
    </div>
  );
}
