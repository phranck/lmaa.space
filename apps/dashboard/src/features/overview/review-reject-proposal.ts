interface ReviewRejectProposal {
  comment: string;
  longText: string;
}

/**
 * Reads the proposed rejection texts out of a validated result.
 *
 * @param result - The validated provider result, or `null`.
 * @returns The two texts, or `null` when the result is not a rejection.
 *
 * @remarks
 * The result has already passed the contract on the backend, so the texts hold
 * no markup. They are still rendered as plain text rather than as Markdown,
 * because this panel exists to let a reviewer read and copy them, not to
 * preview the published page.
 */
export function readRejectProposal(result: unknown): ReviewRejectProposal | null {
  if (typeof result !== "object" || result === null) return null;
  const reject = (result as { reject?: unknown }).reject;
  if (typeof reject !== "object" || reject === null) return null;

  const comment = (reject as { comment?: unknown }).comment;
  const longText = (reject as { longText?: unknown }).longText;
  if (typeof comment !== "string" || typeof longText !== "string") return null;

  return { comment, longText };
}
