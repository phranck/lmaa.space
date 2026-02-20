export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Submission {
  id: number;
  shopName: string;
  shopUrl: string;
  categoryId: number | null;
  categorySuggestion: string | null;
  region: string;
  pickup: string;
  shipping: string;
  description: string;
  submitterEmail: string | null;
  submitterNote: string | null;
  status: SubmissionStatus;
  adminNote: string | null;
  feedbackSent: boolean;
  reviewedBy: number | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionCreate {
  shopName: string;
  shopUrl: string;
  categoryId?: number;
  categorySuggestion?: string;
  region?: string;
  pickup?: string;
  shipping?: string;
  description?: string;
  submitterEmail?: string;
  submitterNote?: string;
}

export interface SubmissionReview {
  status: "approved" | "rejected";
  adminNote?: string;
  sendFeedback?: boolean;
}
