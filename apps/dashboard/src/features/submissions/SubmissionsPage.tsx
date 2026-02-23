import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useAdminCategories } from "@/features/categories/hooks/useAdminCategories.ts";
import { ShopEditCard } from "@/features/shops/ShopEditCard.tsx";
import {
  useAdminSubmissions,
  useDeadLinkReports,
  useDeleteShopFromDeadLinks,
  useDismissDeadLink,
  useReviewSubmission,
} from "@/features/submissions/hooks/useAdminSubmissions.ts";
import type { SubmissionStatus } from "@/features/submissions/hooks/useAdminSubmissions.ts";
import type { Submission } from "@lmaa/shared";
import { useState } from "react";
import { LuExternalLink } from "react-icons/lu";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: "Offen",
  approved: "Angenommen",
  rejected: "Abgelehnt",
};

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
};

// ─── Shop image (favicon + lettermark fallback) ───────────────────────────────

function ShopImage({ url, name }: { url: string; name: string }) {
  const [imgError, setImgError] = useState(false);
  const domain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  return (
    <div className="w-12 h-12 shrink-0 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden">
      {domain && !imgError ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          alt=""
          aria-hidden="true"
          className="w-8 h-8 object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-lg font-bold text-gray-300 select-none">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function VorschlaegeTab() {
  const [filter, setFilter] = useState<SubmissionStatus>("pending");
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [sendFeedback, setSendFeedback] = useState(false);
  const [editSubmission, setEditSubmission] = useState<Submission | null>(null);

  const { data: submissions = [], isLoading } = useAdminSubmissions(filter);
  const { data: categories = [] } = useAdminCategories();
  const reviewMutation = useReviewSubmission();

  // reviewId > 0 = approve, reviewId < 0 = reject
  const reviewing = submissions.find((s) => s.id === Math.abs(reviewId ?? 0));

  return (
    <>
      {/* Status filter */}
      <div className="flex gap-2 mb-6">
        {(["pending", "approved", "rejected"] as SubmissionStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-control text-sm font-medium transition-colors ${
              filter === s
                ? "bg-[var(--color-primary)] text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => `sk-${i}`).map((key) => (
            <div
              key={key}
              className="h-24 bg-white rounded-xl animate-pulse border border-gray-100"
            />
          ))}
        </div>
      )}

      {!isLoading && submissions.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          Keine {STATUS_LABELS[filter].toLowerCase()} Vorschläge.
        </div>
      )}

      <div className="space-y-3">
        {submissions.map((sub) => (
          <div
            key={sub.id}
            className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-4"
          >
            {/* Logo */}
            <ShopImage url={sub.shopUrl} name={sub.shopName} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{sub.shopName}</p>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sub.status as SubmissionStatus]}`}
                >
                  {STATUS_LABELS[sub.status as SubmissionStatus]}
                </span>
              </div>
              <a
                href={sub.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--color-primary)] hover:underline truncate block"
              >
                {sub.shopUrl}
              </a>
              {sub.description && <p className="text-sm text-gray-500 mt-1">{sub.description}</p>}
              {sub.categoryIds && sub.categoryIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {sub.categoryIds.map((id) => {
                    const cat = categories.find((c) => c.id === id);
                    return cat ? (
                      <span
                        key={id}
                        className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs"
                      >
                        {cat.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                <span>{new Date(sub.createdAt).toLocaleDateString("de-DE")}</span>
                {sub.submitterEmail && <span>✉ {sub.submitterEmail}</span>}
              </div>
            </div>

            {/* Actions (pending only) */}
            {filter === "pending" && (
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setReviewId(-sub.id);
                    setAdminNote("");
                    setSendFeedback(!!sub.submitterEmail);
                  }}
                  className="h-8 px-3 border border-red-200 rounded-control text-red-500 text-sm hover:border-red-300 hover:bg-red-50 transition-colors"
                >
                  Ablehnen
                </button>
                <button
                  type="button"
                  onClick={() => setEditSubmission(sub)}
                  className="h-8 px-3 border border-gray-200 rounded-control text-gray-600 text-sm hover:border-gray-300 transition-colors"
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviewId(sub.id);
                    setAdminNote("");
                    setSendFeedback(!!sub.submitterEmail);
                  }}
                  className="h-8 px-3 border border-green-200 rounded-control text-green-700 text-sm hover:border-green-300 hover:bg-green-50 transition-colors"
                >
                  Annehmen
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit submission overlay */}
      {editSubmission !== null && (
        <ShopEditCard
          submissionId={editSubmission.id}
          initialData={{
            name: editSubmission.shopName,
            url: editSubmission.shopUrl,
            description: editSubmission.description ?? "",
            categoryIds: editSubmission.categoryIds ?? [],
            region: Array.isArray(editSubmission.region) ? editSubmission.region : [],
            shipping: editSubmission.shipping ?? "",
          }}
          onClose={() => setEditSubmission(null)}
          onSaved={() => setEditSubmission(null)}
        />
      )}

      {/* Review Modal */}
      {reviewId !== null && reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setReviewId(null)}
            aria-label="Abbrechen"
          />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h3 className="font-bold text-gray-900 mb-1">
              {reviewId > 0 ? "Vorschlag annehmen" : "Vorschlag ablehnen"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{reviewing.shopName}</p>

            <label htmlFor="admin-note" className="block text-sm font-medium text-gray-700 mb-1.5">
              Kommentar <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="admin-note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder={reviewId < 0 ? "Grund für Ablehnung…" : "Optionaler Kommentar…"}
              className="w-full px-4 py-2.5 rounded-control border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm resize-none mb-3"
            />

            {reviewing.submitterEmail && (
              <label className="flex items-center gap-2 text-sm text-gray-600 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendFeedback}
                  onChange={(e) => setSendFeedback(e.target.checked)}
                  className="rounded"
                />
                E-Mail-Feedback senden an{" "}
                <span className="font-medium">{reviewing.submitterEmail}</span>
              </label>
            )}

            {reviewMutation.isError && (
              <p className="text-sm text-red-600 mb-3">
                Fehler: {reviewMutation.error?.message ?? "Unbekannter Fehler"}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setReviewId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-control text-sm text-gray-600 hover:border-gray-300 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate(
                    {
                      id: Math.abs(reviewId),
                      status: reviewId > 0 ? "approved" : "rejected",
                      adminNote,
                      sendFeedback,
                    },
                    {
                      onSuccess: () => {
                        setReviewId(null);
                        setAdminNote("");
                        setSendFeedback(false);
                      },
                    },
                  )
                }
                className={`flex-1 py-2.5 rounded-control text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                  reviewId > 0 ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {reviewMutation.isPending ? "…" : reviewId > 0 ? "Annehmen" : "Ablehnen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DefekteLinksTab() {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const { data: reports = [], isLoading } = useDeadLinkReports();
  const dismissMutation = useDismissDeadLink();
  const deleteMutation = useDeleteShopFromDeadLinks();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => `sk-${i}`).map((key) => (
          <div
            key={key}
            className="h-16 bg-white rounded-xl animate-pulse border border-gray-100"
          />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return <div className="text-center py-16 text-gray-400">Keine gemeldeten defekten Links.</div>;
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div
          key={r.shopId}
          className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4"
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{r.shopName}</p>
            <a
              href={r.shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline truncate"
            >
              {r.shopUrl}
              <LuExternalLink size={12} className="shrink-0" />
            </a>
          </div>

          <span className="shrink-0 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-semibold">
            {r.reportCount}× gemeldet
          </span>

          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => dismissMutation.mutate(r.shopId)}
              disabled={dismissMutation.isPending || deleteMutation.isPending}
              className="px-3 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-control hover:border-gray-300 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              Belassen
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(r.shopId)}
              disabled={dismissMutation.isPending || deleteMutation.isPending}
              className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-control hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Löschen
            </button>
          </div>
        </div>
      ))}

      {/* Delete confirmation modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setConfirmDeleteId(null)}
            aria-label="Abbrechen"
          />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Shop wirklich löschen?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Der Shop wird dauerhaft entfernt und ist nicht mehr im Frontend sichtbar.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-control text-sm text-gray-600 hover:border-gray-300 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  deleteMutation.mutate(confirmDeleteId, {
                    onSuccess: () => setConfirmDeleteId(null),
                  })
                }
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-control text-sm font-semibold text-white transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? "…" : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "vorschlaege" | "defekte-links";

export function SubmissionsPage() {
  const [tab, setTab] = useState<Tab>("vorschlaege");

  const { data: pendingSubmissions = [] } = useAdminSubmissions("pending");
  const { data: deadLinkReports = [] } = useDeadLinkReports();

  const pendingCount = pendingSubmissions.length;
  const deadLinkCount = deadLinkReports.length;

  return (
    <div>
      <PageHeader title="Meldungen">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-control">
          <button
            type="button"
            onClick={() => setTab("vorschlaege")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-[calc(var(--radius-control)-2px)] text-sm font-medium transition-colors ${
              tab === "vorschlaege"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Vorschläge
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("defekte-links")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-[calc(var(--radius-control)-2px)] text-sm font-medium transition-colors ${
              tab === "defekte-links"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Defekte Links
            {deadLinkCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                {deadLinkCount}
              </span>
            )}
          </button>
        </div>
      </PageHeader>

      {tab === "vorschlaege" ? <VorschlaegeTab /> : <DefekteLinksTab />}
    </div>
  );
}
