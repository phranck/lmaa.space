export type ReviewState = {
  adminNote: string;
  editingRejection: boolean;
  rejectionLongText: string;
  rejectionToken: string | null;
  reviewMode: "approve" | "reject" | null;
  notificationTemplateId: number | undefined;
  mastodonTemplateId: number | undefined;
};

export type ReviewAction =
  | { type: "close" }
  | { type: "openApprove"; adminNote: string; mastodonTemplateId?: number }
  | {
      type: "openReject";
      adminNote: string;
      editingRejection: boolean;
      rejectionLongText: string;
      rejectionToken: string | null;
    }
  | { type: "setAdminNote"; value: string }
  | { type: "setRejectionLongText"; value: string }
  | { type: "setNotificationTemplateId"; value: number | undefined }
  | { type: "setMastodonTemplateId"; value: number | undefined };

const STORAGE_KEY_APPROVED = "submissions:notification-template:approved";
const STORAGE_KEY_REJECTED = "submissions:notification-template:rejected";

function loadPersistedTemplateId(key: string): number | undefined {
  const raw = localStorage.getItem(key);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function persistTemplateId(key: string, value: number | undefined) {
  if (value) {
    localStorage.setItem(key, String(value));
  } else {
    localStorage.removeItem(key);
  }
}

export const EMPTY_REVIEW_STATE: ReviewState = {
  adminNote: "",
  editingRejection: false,
  rejectionLongText: "",
  rejectionToken: null,
  reviewMode: null,
  notificationTemplateId: undefined,
  mastodonTemplateId: undefined,
};

export function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case "close":
      return EMPTY_REVIEW_STATE;
    case "openApprove":
      return {
        ...EMPTY_REVIEW_STATE,
        reviewMode: "approve",
        adminNote: action.adminNote,
        notificationTemplateId: loadPersistedTemplateId(STORAGE_KEY_APPROVED),
        mastodonTemplateId: action.mastodonTemplateId,
      };
    case "openReject":
      return {
        adminNote: action.adminNote,
        editingRejection: action.editingRejection,
        rejectionLongText: action.rejectionLongText,
        rejectionToken: action.rejectionToken,
        reviewMode: "reject",
        notificationTemplateId: loadPersistedTemplateId(STORAGE_KEY_REJECTED),
        mastodonTemplateId: undefined,
      };
    case "setAdminNote":
      return { ...state, adminNote: action.value };
    case "setRejectionLongText":
      return { ...state, rejectionLongText: action.value };
    case "setNotificationTemplateId": {
      const storageKey =
        state.reviewMode === "approve" ? STORAGE_KEY_APPROVED : STORAGE_KEY_REJECTED;
      persistTemplateId(storageKey, action.value);
      return { ...state, notificationTemplateId: action.value };
    }
    case "setMastodonTemplateId":
      return { ...state, mastodonTemplateId: action.value };
  }
}
