import { AlertDialog } from "@lmaa/ui";

import { useMarkdownHtml } from "@/hooks/useMarkdownHtml";
import { getSafeActionUrl } from "@/lib/safe-url";

export interface SubmitErrorState {
  message: string;
  status?: "published" | "rejected" | "pending" | "available" | "invalid" | "blocked";
  shopName?: string;
  shopUrl?: string;
  rejectionUrl?: string;
  messageMarkdown?: string;
}

function PublishedShopName({ name, url }: { name: string | undefined; url: string | undefined }) {
  if (!name) return null;
  // Sanitize the stored shop URL: a `javascript:`/`data:` value must never become
  // a clickable href. Fall back to plain text when the URL is unsafe.
  const safeUrl = url ? getSafeActionUrl(url) : null;
  if (!safeUrl) return <strong>{name}</strong>;
  const isExternal = /^https?:\/\//i.test(safeUrl);
  return (
    <a
      href={safeUrl}
      className="font-bold text-[var(--ds-accent)] underline hover:no-underline"
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {name}
    </a>
  );
}

function BlockedMessage({
  messageMarkdown,
  fallback,
}: {
  messageMarkdown?: string;
  fallback: string;
}) {
  const messageRef = useMarkdownHtml(messageMarkdown);

  if (!messageMarkdown) {
    return <p>{fallback}</p>;
  }

  return (
    <div
      ref={messageRef}
      className="prose prose-sm max-w-none text-[var(--ds-text)] [&_p]:m-0 [&_p+p]:mt-3 prose-a:text-[var(--ds-accent)] prose-a:underline hover:prose-a:no-underline"
    />
  );
}

interface SubmitErrorDialogProps {
  submitError: SubmitErrorState | null;
  onClose: () => void;
}

/**
 * Alert dialog for duplicate-shop checks, validation failures and submit errors.
 */
export function SubmitErrorDialog({ submitError, onClose }: SubmitErrorDialogProps) {
  return (
    <AlertDialog
      open={!!submitError}
      title={
        submitError?.status === "rejected"
          ? "Shop abgelehnt"
          : submitError?.status === "pending"
            ? "Shop wird bereits geprüft"
            : submitError?.status === "blocked"
              ? "Hinweis"
              : submitError?.status === "available"
                ? "Shop ist verfügbar"
                : submitError?.status === "invalid"
                  ? "Ungültige URL"
                  : "Shop bereits vorhanden"
      }
      variant={
        submitError?.status === "rejected"
          ? "warning"
          : submitError?.status === "blocked"
            ? "warning"
            : submitError?.status === "available"
              ? "info"
              : "error"
      }
      buttonLabel="Verstanden"
      onClose={onClose}
    >
      {submitError?.status === "blocked" ? (
        <BlockedMessage
          messageMarkdown={submitError.messageMarkdown}
          fallback={submitError.message}
        />
      ) : submitError?.status === "invalid" ? (
        <p>
          Bitte eine gültige Shop-URL eingeben (z.B. <code>example.de</code>).
        </p>
      ) : submitError?.status === "rejected" ? (
        <p>
          Der Shop <strong>{submitError.shopName}</strong> wurde bereits geprüft und abgelehnt. Eine
          ausführliche Begründung für die Ablehnung kannst du{" "}
          {submitError.rejectionUrl ? (
            <a
              href={submitError.rejectionUrl}
              className="text-[var(--ds-accent)] underline hover:no-underline"
            >
              hier einsehen
            </a>
          ) : (
            "beim Betreiber anfragen"
          )}
          .
        </p>
      ) : submitError?.status === "pending" ? (
        <p>
          Da hatte wohl jemand bereits die gleiche Idee!
          <br />
          Der Shop <strong>{submitError.shopName}</strong> wurde schon eingereicht und wartet auf
          Prüfung.
        </p>
      ) : submitError?.status === "available" ? (
        <p>
          Der Shop ist noch nicht eingetragen.
          <br />
          Du kannst die Eintragung jetzt absenden.
        </p>
      ) : (
        <p>
          Da hatte wohl jemand bereits die gleiche Idee!
          <br />
          Der Shop <PublishedShopName name={submitError?.shopName} url={submitError?.shopUrl} /> ist
          schon eingetragen.
        </p>
      )}
    </AlertDialog>
  );
}
