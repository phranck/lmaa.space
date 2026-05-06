import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  DownloadIcon,
  FileTextIcon,
  InfoIcon,
  PauseCircleIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";

import type { Submission } from "@lmaa/shared";

import { EditorToolbarButton } from "@/components/ui/EditorToolbarButton.tsx";
import type { DashboardMessages } from "@/i18n/messages.ts";
import { FRONTEND_URL } from "@/lib/env.ts";

interface SubmissionToolbarProps {
  submission: Submission;
  isActionPending: boolean;
  canSave: boolean;
  saveLabel: string;
  messages: DashboardMessages["submissions"];
  onApprove: () => void;
  onReject: (editingRejection: boolean) => void;
  onSetStatus: (status: "pending" | "onhold", options?: { navigateBack?: boolean }) => void;
  onDelete: () => void;
  onSave: () => void;
}

export function SubmissionToolbar({
  submission,
  isActionPending,
  canSave,
  saveLabel,
  messages: submissionsMessages,
  onApprove,
  onReject,
  onSetStatus,
  onDelete,
  onSave,
}: SubmissionToolbarProps) {
  const isRejected = submission.status === "rejected";
  const isPending = submission.status === "pending";
  const isOnHold = submission.status === "onhold";
  const showDelete = submission.status === "onhold" || submission.status === "rejected";

  return (
    <div className="flex items-center gap-2">
      {isPending && (
        <>
          <EditorToolbarButton
            onClick={onApprove}
            disabled={isActionPending}
            variant="success"
            icon={<CheckCircleIcon weight="duotone" className="h-3.5 w-3.5" />}
          >
            {submissionsMessages.suggestions.approve}
          </EditorToolbarButton>
          <EditorToolbarButton
            onClick={() => onSetStatus("onhold")}
            disabled={isActionPending}
            variant="warning"
            icon={<PauseCircleIcon weight="duotone" className="h-3.5 w-3.5" />}
          >
            {submissionsMessages.suggestions.onhold}
          </EditorToolbarButton>
          <EditorToolbarButton
            onClick={() => onReject(false)}
            disabled={isActionPending}
            variant="danger"
            icon={<XCircleIcon weight="duotone" className="h-3.5 w-3.5" />}
          >
            {submissionsMessages.suggestions.reject}
          </EditorToolbarButton>
        </>
      )}

      {isOnHold && (
        <>
          <EditorToolbarButton
            onClick={() => onSetStatus("pending")}
            disabled={isActionPending}
            variant="success"
            icon={<ArrowCounterClockwiseIcon weight="duotone" className="h-3.5 w-3.5" />}
          >
            {submissionsMessages.suggestions.restore}
          </EditorToolbarButton>
          <EditorToolbarButton
            onClick={() => onReject(false)}
            disabled={isActionPending}
            variant="danger"
            icon={<XCircleIcon weight="duotone" className="h-3.5 w-3.5" />}
          >
            {submissionsMessages.suggestions.reject}
          </EditorToolbarButton>
        </>
      )}

      {isRejected && (
        <>
          <EditorToolbarButton
            onClick={onApprove}
            disabled={isActionPending}
            variant="success"
            icon={<CheckCircleIcon weight="duotone" className="h-3.5 w-3.5" />}
          >
            {submissionsMessages.suggestions.approve}
          </EditorToolbarButton>

          <EditorToolbarButton
            onClick={() => onReject(true)}
            disabled={isActionPending}
            variant="neutral"
            icon={<FileTextIcon weight="duotone" className="h-3.5 w-3.5" />}
          >
            {submissionsMessages.suggestions.editRejectionInfo}
          </EditorToolbarButton>

          {submission.rejectionToken ? (
            <EditorToolbarButton
              onClick={() =>
                window.open(
                  `${FRONTEND_URL}/rejected/${submission.rejectionToken}`,
                  "_blank",
                )
              }
              disabled={isActionPending}
              variant="warning"
              icon={<InfoIcon weight="duotone" className="h-3.5 w-3.5" />}
            >
              {submissionsMessages.suggestions.info}
            </EditorToolbarButton>
          ) : (
            <EditorToolbarButton
              onClick={() => onSetStatus("pending")}
              disabled={isActionPending}
              variant="success"
              icon={<ArrowCounterClockwiseIcon weight="duotone" className="h-3.5 w-3.5" />}
            >
              {submissionsMessages.suggestions.setToOpen}
            </EditorToolbarButton>
          )}
        </>
      )}

      {showDelete && (
        <EditorToolbarButton
          onClick={onDelete}
          disabled={isActionPending}
          variant="danger"
          icon={<TrashIcon weight="duotone" className="h-3.5 w-3.5" />}
        >
          {submissionsMessages.suggestions.delete}
        </EditorToolbarButton>
      )}

      <EditorToolbarButton
        onClick={onSave}
        disabled={!canSave || isActionPending}
        variant="primary"
        icon={<DownloadIcon weight="duotone" className="h-3.5 w-3.5" />}
      >
        {saveLabel}
      </EditorToolbarButton>
    </div>
  );
}
