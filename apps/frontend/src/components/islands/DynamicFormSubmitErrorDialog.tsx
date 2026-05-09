import { AlertDialog } from "@lmaa/ui";

export interface SubmitErrorState {
  message: string;
  status?: "published" | "rejected" | "pending" | "available" | "invalid";
  shopName?: string;
  shopUrl?: string;
  rejectionUrl?: string;
}

function PublishedShopName({ name, url }: { name: string | undefined; url: string | undefined }) {
  if (!name) return null;
  if (!url) return <strong>{name}</strong>;
  const isExternal = /^https?:\/\//i.test(url);
  return (
    <a
      href={url}
      className="font-bold text-[var(--ds-accent)] underline hover:no-underline"
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {name}
    </a>
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
            : submitError?.status === "available"
              ? "Shop ist verfügbar"
              : submitError?.status === "invalid"
                ? "Ungültige URL"
                : "Shop bereits vorhanden"
      }
      variant={
        submitError?.status === "rejected"
          ? "warning"
          : submitError?.status === "available"
            ? "info"
            : "error"
      }
      buttonLabel="Verstanden"
      onClose={onClose}
    >
      {submitError?.status === "invalid" ? (
        <p>
          Bitte eine gültige Shop-URL eingeben (z.B. <code>example.de</code>).
        </p>
      ) : submitError?.status === "rejected" ? (
        <p>
          Der Shop <strong>{submitError.shopName}</strong> wurde bereits geprüft und abgelehnt.
          Eine ausführliche Begründung für die Ablehnung kannst du{" "}
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
