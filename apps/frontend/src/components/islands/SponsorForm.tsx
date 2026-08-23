import { SealWarningIcon } from "@phosphor-icons/react";
import { useReducer } from "react";

import { MAX_PENDING_CLAIM, type PendingSponsorshipReceipt } from "@lmaa/contracts";
import { classifyProfileLink, type SponsorFormLabelKey } from "@lmaa/shared";
import { AlertDialog } from "@lmaa/ui";
import { ToggleSwitch } from "@lmaa/ui/toggle-switch";

import { API_BASE } from "@/lib/client-api";
import {
  buttonBaseClass,
  buttonFilledClass,
  errorClass,
  inputClass,
  labelClass,
} from "@/lib/form-styles";

/**
 * Props for {@link SponsorForm}.
 *
 * @property amountEur - What the ladder above currently stands on, which is the
 *   amount the code they scan carries and therefore the one they announced.
 * @property labels - Every word the form says, from the page's own
 *   `[[sponsorform]]` node.
 * @property onIssued - Told the reference once the site has answered with one,
 *   so the transfer details can start quoting it.
 */
interface SponsorFormProps {
  amountEur: number;
  labels: Record<SponsorFormLabelKey, string>;
  onIssued: (receipt: PendingSponsorshipReceipt) => void;
}

/** How long a given name or a family name may be, matching the contract. */
const MAX_NAME = 80;

/** How long an address may be, matching the contract. */
const MAX_LINK = 200;

/** What somebody has typed, and what the form is doing with it. */
interface FormState {
  firstName: string;
  lastName: string;
  link: string;
  claim: string;
  published: boolean;
  /** Set whilst the site is being asked, which is what stops a second ask. */
  sending: boolean;
  /** What is wrong with the address, shown under it. */
  linkError: string | null;
  /** Why the ask did not go through, shown in a dialogue. */
  failure: string | null;
}

/** The form as nobody has touched it yet. */
const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  link: "",
  claim: "",
  published: true,
  sending: false,
  linkError: null,
  failure: null,
};

/** Everything that happens to the form. */
type FormAction =
  | { type: "edit"; field: "firstName" | "lastName" | "claim"; value: string }
  | { type: "editLink"; value: string }
  | { type: "setPublished"; value: boolean }
  | { type: "linkRefused"; message: string }
  | { type: "sending" }
  | { type: "failed"; message: string }
  | { type: "dismissFailure" };

function reduce(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "edit":
      return { ...state, [action.field]: action.value };
    case "editLink":
      // Typing on answers a complaint about the address, so the complaint goes
      // with the keystroke rather than staying until the next attempt.
      return { ...state, link: action.value, linkError: null };
    case "setPublished":
      return { ...state, published: action.value };
    case "linkRefused":
      return { ...state, linkError: action.message };
    case "sending":
      return { ...state, sending: true, linkError: null };
    case "failed":
      return { ...state, sending: false, failure: action.message };
    case "dismissFailure":
      return { ...state, failure: null };
  }
}

/**
 * The mark behind the name of a field that has to be filled in.
 *
 * The same one the shop submission carries, because somebody who has met it
 * once on this site should not have to learn a second sign for the same thing.
 */
function Required() {
  return (
    <SealWarningIcon
      weight="duotone"
      className="inline-block ml-1 size-3.5 text-[var(--ds-danger-text)] align-middle"
      aria-hidden="true"
    />
  );
}

/**
 * The form that takes what a payment cannot carry.
 *
 * A SEPA transfer holds either a sentence or a reference and never both, and
 * the sentence is the half a payer's app may let them edit and a bank may fold.
 * So the name, the address, the claim and the answer about being named are
 * given here, and the transfer carries only the reference this asks for.
 *
 * The address is one field rather than one per service. Which service it
 * belongs to is worked out from the address itself, here so a mistyped one is
 * answered at once, and again on the server, which is the side that decides.
 */
export default function SponsorForm({ amountEur, labels, onIssued }: SponsorFormProps) {
  const [form, dispatch] = useReducer(reduce, EMPTY_FORM);
  const remaining = MAX_PENDING_CLAIM - form.claim.length;
  // Everything is asked for, so nothing is sent until everything is there. The
  // button says as much by being unavailable rather than by complaining after
  // the fact.
  const complete =
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    form.link.trim() !== "" &&
    form.claim.trim() !== "";

  async function submit() {
    if (form.sending) return;

    const trimmedLink = form.link.trim();
    if (!classifyProfileLink(trimmedLink)) {
      dispatch({ type: "linkRefused", message: labels.linkInvalid });
      return;
    }

    dispatch({ type: "sending" });

    try {
      const response = await fetch(`${API_BASE}/sponsorships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          link: trimmedLink,
          claim: form.claim.trim(),
          // What stands on the ladder at this moment, which is what the code
          // beneath the form carries. Whether that is what arrives is settled
          // against the statement rather than here.
          amountCents: Math.round(amountEur * 100),
          published: form.published,
        }),
      });

      if (!response.ok) {
        dispatch({
          type: "failed",
          message: response.status === 429 ? labels.failureRateLimited : labels.failureRejected,
        });
        return;
      }

      // Nothing is dispatched afterwards: what stands here is replaced by the
      // reference the moment the page above has it.
      const answered = (await response.json()) as { data: PendingSponsorshipReceipt };
      onIssued(answered.data);
    } catch {
      dispatch({ type: "failed", message: labels.failureOffline });
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="grid gap-4"
      aria-label={labels.submitLabel}
    >
      {/* The three answers a person gives about themselves stand in one row of
          equal columns, so none of them reads as the important one. They stack
          on a narrow screen. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className={labelClass}>
            {labels.firstNameLabel}
            <Required />
          </span>
          <input
            className={inputClass}
            value={form.firstName}
            maxLength={MAX_NAME}
            required
            autoComplete="given-name"
            onChange={(event) =>
              dispatch({ type: "edit", field: "firstName", value: event.target.value })
            }
          />
        </label>
        <label className="block">
          <span className={labelClass}>
            {labels.lastNameLabel}
            <Required />
          </span>
          <input
            className={inputClass}
            value={form.lastName}
            maxLength={MAX_NAME}
            required
            autoComplete="family-name"
            onChange={(event) =>
              dispatch({ type: "edit", field: "lastName", value: event.target.value })
            }
          />
        </label>
        <label className="block">
          <span className={labelClass}>
            {labels.linkLabel}
            <Required />
          </span>
          <input
            className={inputClass}
            value={form.link}
            maxLength={MAX_LINK}
            required
            inputMode="url"
            placeholder={labels.linkPlaceholder}
            onChange={(event) => dispatch({ type: "editLink", value: event.target.value })}
          />
        </label>
      </div>

      {form.linkError ? (
        <p className={`${errorClass} px-1 -mt-2`}>{form.linkError}</p>
      ) : (
        <p className="text-xs text-[var(--ds-text-subtle)] px-1 -mt-2">{labels.linkHint}</p>
      )}

      <label className="block">
        <span className="flex items-baseline justify-between gap-4">
          <span className={labelClass}>
            {labels.claimLabel}
            <Required />
          </span>
          <span className="text-xs text-[var(--ds-text-subtle)] px-1">
            {labels.claimRemaining.replaceAll("{n}", String(remaining))}
          </span>
        </span>
        <textarea
          className={`${inputClass} h-auto py-2 resize-none`}
          rows={3}
          value={form.claim}
          required
          maxLength={MAX_PENDING_CLAIM}
          onChange={(event) =>
            dispatch({ type: "edit", field: "claim", value: event.target.value })
          }
        />
      </label>

      {/* The last decision and the button that acts on it share one row, with
          the button on the right where a form ends. They stack on a narrow
          screen, and the button then takes the full width. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-[var(--ds-text)] px-1">
          <ToggleSwitch
            checked={form.published}
            onChange={(value) => dispatch({ type: "setPublished", value })}
            aria-label={labels.publishedLabel}
          />
          <span>{labels.publishedLabel}</span>
        </div>

        <button
          type="submit"
          disabled={form.sending || !complete}
          className={`${buttonBaseClass} ${buttonFilledClass} max-sm:w-full max-sm:justify-center`}
        >
          {form.sending ? labels.submitBusyLabel : labels.submitLabel}
        </button>
      </div>

      <AlertDialog
        open={form.failure !== null}
        title={labels.failureTitle}
        variant="error"
        buttonLabel={labels.failureClose}
        onClose={() => dispatch({ type: "dismissFailure" })}
      >
        <p>{form.failure}</p>
      </AlertDialog>
    </form>
  );
}
