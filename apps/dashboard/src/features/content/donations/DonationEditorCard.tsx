import { HandCoinsIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import {
  DONATION_PROVIDERS,
  DONATION_PROVIDER_KEYS,
  type Donation,
  type DonationInput,
  type DonationProvider,
} from "@lmaa/contracts";
import { fullName } from "@lmaa/shared";
import { SocialMediaEditor } from "@lmaa/ui";

import {
  CancelActionButton,
  DeleteActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import {
  DashboardCombobox,
  DashboardField,
  DashboardInput,
  DashboardNumberInput,
  DashboardSwitchField,
  DashboardTextarea,
} from "@/components/ui/DashboardControls.tsx";
import { DateTimePicker } from "@/components/ui/DateTimePicker.tsx";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { getSocialMediaEditorMessages } from "@/i18n/social-media-editor.ts";
import { useFavicons } from "@/lib/useFavicons.ts";

import { useCreateDonation, useDeleteDonation, useSaveDonation } from "./hooks/useDonations.ts";

/** The route a new payment is assumed to have taken until somebody says otherwise. */
const DEFAULT_PROVIDER: DonationProvider = "sepa";

/**
 * A new payment, dated today.
 *
 * @returns An empty form state.
 */
function emptyDonation(): DonationInput {
  return {
    firstName: "",
    lastName: "",
    socialMedia: [],
    published: false,
    amountCents: 0,
    receivedAt: new Date().toISOString().slice(0, 10),
    provider: DEFAULT_PROVIDER,
    note: "",
    sponsorId: null,
  };
}

/**
 * Strips what the server owns from a stored payment.
 *
 * @param donation - A payment as read back from the backend.
 * @returns The editable fields alone.
 */
function toInput(donation: Donation): DonationInput {
  const { id: _id, createdAt: _createdAt, ...fields } = donation;
  return fields;
}

interface DonationEditorCardProps {
  /** The payment being edited, or `"new"` for one that does not exist yet. */
  donationId: string | null;
  /** The ledger the editor reads the stored payment back from. */
  donations: Donation[];
  onClose: () => void;
}

/**
 * The form for one payment.
 *
 * The amount stands beside the day it arrived and the route it took, because
 * those three are what a bank statement gives and they are entered together.
 * The name and the consent to use it sit above them, since one is meaningless
 * without the other.
 */
export function DonationEditorCard({ donationId, donations, onClose }: DonationEditorCardProps) {
  const { locale, messages } = useI18n();
  const common = messages.common;
  const text = messages.system.donations;
  const isNew = donationId === "new";

  const create = useCreateDonation();
  const save = useSaveDonation();
  const remove = useDeleteDonation();

  const stored = donations.find((donation) => donation.id === donationId) ?? null;
  const [draft, setDraft] = useState<DonationInput | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const base = useMemo(
    () => (isNew ? emptyDonation() : stored ? toInput(stored) : null),
    [isNew, stored],
  );
  const fields = draft ?? base;
  const isPending = create.isPending || save.isPending || remove.isPending;
  const socialMedia = fields?.socialMedia ?? [];
  const favicons = useFavicons(socialMedia);
  const displayName = fullName(fields?.firstName ?? "", fields?.lastName ?? "");

  const providerOptions = useMemo(
    () => DONATION_PROVIDER_KEYS.map((key) => ({ value: key, label: DONATION_PROVIDERS[key] })),
    [],
  );

  function update(patch: Partial<DonationInput>) {
    setDraft((current) => {
      const previous = current ?? base;
      return previous ? { ...previous, ...patch } : null;
    });
  }

  function handleClose() {
    // Dropped here rather than on reopening, so the next payment starts from
    // the empty form instead of from whatever was abandoned.
    setDraft(null);
    onClose();
  }

  function handleSave() {
    if (!fields) return;

    if (isNew) {
      create.mutate(fields, { onSuccess: handleClose });
      return;
    }
    if (!donationId) return;
    save.mutate({ id: donationId, input: fields }, { onSuccess: handleClose });
  }

  return (
    <>
      <OverlayCard
        open={donationId !== null}
        onClose={handleClose}
        aria-label={displayName || text.newDonation}
        size={{ storageKey: "donations:editor-card", defaultWidth: 720, defaultHeight: 620 }}
      >
        <OverlayCard.Header className="flex items-center gap-3">
          <HandCoinsIcon weight="duotone" className={dialogHeaderIconClass} />
          <h2 className="text-base font-semibold text-[var(--ds-text)]">
            {displayName || text.newDonation}
          </h2>
        </OverlayCard.Header>

        <OverlayCard.Body>
          {fields && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <DashboardInput
                  label={text.firstNameLabel}
                  value={fields.firstName}
                  onChange={(event) => update({ firstName: event.target.value })}
                />
                <DashboardInput
                  label={text.lastNameLabel}
                  value={fields.lastName}
                  onChange={(event) => update({ lastName: event.target.value })}
                />
              </div>

              <DashboardField label={text.socialMediaLabel} hint={text.socialMediaHint}>
                <SocialMediaEditor
                  value={socialMedia}
                  onChange={(next) => update({ socialMedia: next })}
                  messages={getSocialMediaEditorMessages(locale)}
                  favicons={favicons}
                  blurOnPaste
                />
              </DashboardField>

              <DashboardSwitchField
                label={text.publishedLabel}
                description={text.publishedHint}
                checked={fields.published}
                onCheckedChange={(checked) => update({ published: checked })}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <DashboardNumberInput
                  label={text.amountLabel}
                  hint={text.amountHint}
                  value={fields.amountCents / 100}
                  min={0}
                  step={1}
                  onChange={(event) =>
                    update({ amountCents: Math.round(Number(event.target.value) * 100) })
                  }
                />
                <DashboardField label={text.receivedAtLabel} hint={text.receivedAtHint}>
                  <DateTimePicker
                    mode="date"
                    value={fields.receivedAt}
                    onChange={(value) => update({ receivedAt: value })}
                  />
                </DashboardField>
                <DashboardCombobox
                  label={text.providerLabel}
                  hint={text.providerHint}
                  options={providerOptions}
                  value={fields.provider}
                  onValueChange={(value) => update({ provider: value as DonationProvider })}
                />
              </div>

              <DashboardTextarea
                label={text.noteLabel}
                hint={text.noteHint}
                rows={3}
                value={fields.note}
                onChange={(event) => update({ note: event.target.value })}
              />
            </div>
          )}
        </OverlayCard.Body>

        <OverlayCard.Footer className="flex justify-end gap-2">
          {!isNew && (
            <DeleteActionButton
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              label={common.delete}
              className="mr-auto"
            />
          )}
          <CancelActionButton label={common.cancel} onClick={handleClose} />
          <SaveActionButton
            onClick={handleSave}
            disabled={!fields || isPending}
            busy={isPending}
            label={isPending ? common.saving : common.save}
          />
        </OverlayCard.Footer>
      </OverlayCard>

      <DeleteConfirmDialog
        open={confirmDelete}
        title={text.deleteTitle}
        description={text.deleteMessage}
        cancelLabel={common.cancel}
        deleteLabel={common.delete}
        isPending={remove.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (!donationId) return;
          // The question has been answered, so it goes before the editor does.
          // Closing only the editor leaves the dialogue standing over whatever
          // is behind it, asking about a payment that is already gone.
          remove.mutate(donationId, {
            onSuccess: () => {
              setConfirmDelete(false);
              handleClose();
            },
          });
        }}
      />
    </>
  );
}
