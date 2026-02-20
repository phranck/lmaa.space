import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Submission } from "@dein-shop/shared";
import { api } from "../../lib/api.ts";

type Status = "pending" | "approved" | "rejected";

const STATUS_LABELS: Record<Status, string> = {
  pending: "Offen",
  approved: "Angenommen",
  rejected: "Abgelehnt",
};

const STATUS_COLORS: Record<Status, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
};

export function SubmissionsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status>("pending");
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [sendFeedback, setSendFeedback] = useState(false);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["submissions", filter],
    queryFn: () => api.get<Submission[]>(`/admin/submissions?status=${filter}`),
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: "approved" | "rejected";
    }) =>
      api.patch(`/admin/submissions/${id}`, {
        status,
        adminNote: adminNote || undefined,
        sendFeedback,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      setReviewId(null);
      setAdminNote("");
      setSendFeedback(false);
    },
  });

  const reviewing = submissions.find((s) => s.id === reviewId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vorschläge</h1>
        <div className="flex gap-2">
          {(["pending", "approved", "rejected"] as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === s
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl animate-pulse border border-gray-100" />
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
            className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{sub.shopName}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sub.status]}`}>
                  {STATUS_LABELS[sub.status]}
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
              {sub.description && (
                <p className="text-sm text-gray-500 mt-1">{sub.description}</p>
              )}
              <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                <span>{new Date(sub.createdAt).toLocaleDateString("de-DE")}</span>
                {sub.submitterEmail && <span>✉ {sub.submitterEmail}</span>}
              </div>
            </div>

            {filter === "pending" && (
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setReviewId(sub.id);
                    setAdminNote("");
                    setSendFeedback(!!sub.submitterEmail);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Annehmen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviewId(-(sub.id));
                    setAdminNote("");
                    setSendFeedback(!!sub.submitterEmail);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Ablehnen
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

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

            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Kommentar{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder={
                reviewId < 0
                  ? "Grund für Ablehnung..."
                  : "Optionaler Kommentar..."
              }
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm resize-none mb-3"
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

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setReviewId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate({
                    id: Math.abs(reviewId),
                    status: reviewId > 0 ? "approved" : "rejected",
                  })
                }
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                  reviewId > 0
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {reviewMutation.isPending
                  ? "..."
                  : reviewId > 0
                    ? "Annehmen"
                    : "Ablehnen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
