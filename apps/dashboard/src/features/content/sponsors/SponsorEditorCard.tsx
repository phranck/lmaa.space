import { HandHeartIcon } from "@phosphor-icons/react";
import { useMemo, useRef, useState } from "react";

import { SPONSORING_DEFAULTS, type Sponsor, type SponsorInput } from "@lmaa/contracts";
import { fullName, type SocialMediaLinks } from "@lmaa/shared";
import { SocialMediaEditor } from "@lmaa/ui";

import { AlertDialog } from "@/components/ui/AlertDialog.tsx";
import {
  CancelActionButton,
  DeleteActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import {
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

import {
  useCreateSponsor,
  useDeleteSponsor,
  useResolveSponsorAvatar,
  useSaveSponsor,
  useSponsoringConfig,
  useSponsors,
} from "./hooks/useSponsors.ts";
import { canFetchPicture, lookupKey, shouldFetchPicture } from "./sponsor-picture-lookup.ts";
import { SponsorPictureEditor } from "./SponsorPictureEditor.tsx";

/**
 * A new sponsor, with the amount already at the minimum in force.
 *
 * @param minAmountCents - The least a sponsor gives to be named, in cents.
 * @returns An empty form state.
 */
function emptySponsor(minAmountCents: number): SponsorInput {
  return {
    firstName: "",
    lastName: "",
    socialMedia: [],
    imageUrl: "",
    claim: "",
    published: true,
    amountCents: minAmountCents,
    paidAt: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Strips what the server owns from a stored sponsor.
 *
 * @param sponsor - A sponsor as read back from the backend.
 * @returns The editable fields alone.
 */
function toInput(sponsor: Sponsor): SponsorInput {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...fields } = sponsor;
  return fields;
}

interface SponsorEditorCardProps {
  /** The sponsor being edited, or `"new"` for one that does not exist yet. */
  sponsorId: string | null;
  onClose: () => void;
}

/**
 * The form for one sponsor.
 *
 * The picture stands on the left with the buttons that change it, everything a
 * visitor reads stands on the right, and the amount sits with the day it was
 * paid, because those two only ever matter together.
 *
 * The picture is resolved from the social media address as it is entered rather
 * than when the form is saved, so what gets stored is an address this site
 * serves and no reader's browser asks a foreign instance for anything.
 */
export function SponsorEditorCard({ sponsorId, onClose }: SponsorEditorCardProps) {
  const { locale, messages } = useI18n();
  const common = messages.common;
  const text = messages.system.sponsors;
  const isNew = sponsorId === "new";

  const { data: sponsors } = useSponsors();
  const { data: config } = useSponsoringConfig();
  const create = useCreateSponsor();
  const save = useSaveSponsor();
  const remove = useDeleteSponsor();
  const resolveAvatar = useResolveSponsorAvatar();

  const stored = sponsors?.find((sponsor) => sponsor.id === sponsorId) ?? null;
  const [draft, setDraft] = useState<SponsorInput | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pictureMissing, setPictureMissing] = useState(false);
  /** What the last lookup asked about, so the same question is not asked twice. */
  const lastLookup = useRef("");

  const minAmountCents = config?.minAmountCents ?? SPONSORING_DEFAULTS.minAmountCents;
  const base = useMemo(
    () => (isNew ? emptySponsor(minAmountCents) : stored ? toInput(stored) : null),
    [isNew, minAmountCents, stored],
  );
  const fields = draft ?? base;
  const isPending = create.isPending || save.isPending || remove.isPending;
  const socialMedia = fields?.socialMedia ?? [];
  const favicons = useFavicons(socialMedia);
  const displayName = fullName(fields?.firstName ?? "", fields?.lastName ?? "");

  function update(patch: Partial<SponsorInput>) {
    setDraft((current) => {
      const previous = current ?? base;
      return previous ? { ...previous, ...patch } : null;
    });
  }

  function fetchPicture(next: SocialMediaLinks) {
    lastLookup.current = lookupKey(next);
    setPictureMissing(false);
    resolveAvatar.mutate(next, {
      onSuccess: (result) => {
        if (result.imageUrl) update({ imageUrl: result.imageUrl });
        else setPictureMissing(true);
      },
    });
  }

  function handleSocialMediaChange(next: SocialMediaLinks) {
    update({ socialMedia: next });
    if (shouldFetchPicture(next, lastLookup.current)) fetchPicture(next);
  }

  function handleSave() {
    if (!fields) return;

    // Saving ends the editing, whether the sponsor is new or was already
    // there: the list behind the card is where the result is read.
    function done() {
      setDraft(null);
      onClose();
    }

    if (isNew) {
      create.mutate(fields, { onSuccess: done });
      return;
    }
    if (!sponsorId) return;
    save.mutate({ id: sponsorId, input: fields }, { onSuccess: done });
  }

  return (
    <>
      <OverlayCard
        open={sponsorId !== null}
        onClose={onClose}
        aria-label={displayName || text.newSponsor}
        size={{ storageKey: "sponsors:editor-card", defaultWidth: 780, defaultHeight: 620 }}
      >
        <OverlayCard.Header className="flex items-center gap-3">
          <HandHeartIcon weight="duotone" className={dialogHeaderIconClass} />
          <h2 className="text-base font-semibold text-[var(--ds-text)]">
            {displayName || text.newSponsor}
          </h2>
        </OverlayCard.Header>

        <OverlayCard.Body>
          {fields && (
            <div className="flex items-start gap-6">
              <SponsorPictureEditor
                imageUrl={fields.imageUrl}
                displayName={displayName || text.newSponsor}
                canFetch={canFetchPicture(socialMedia)}
                isFetching={resolveAvatar.isPending}
                onFetch={() => fetchPicture(socialMedia)}
                onRemove={() => update({ imageUrl: "" })}
                sponsorMessages={text}
              />

              <div className="flex min-w-0 flex-1 flex-col gap-4">
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
                    onChange={handleSocialMediaChange}
                    messages={getSocialMediaEditorMessages(locale)}
                    favicons={favicons}
                    blurOnPaste
                  />
                </DashboardField>

                <DashboardInput
                  label={text.imageLabel}
                  hint={text.imageHint}
                  value={fields.imageUrl}
                  onChange={(event) => update({ imageUrl: event.target.value })}
                />

                <DashboardTextarea
                  label={text.claimLabel}
                  hint={text.claimHint}
                  rows={3}
                  value={fields.claim}
                  onChange={(event) => update({ claim: event.target.value })}
                />

                <DashboardSwitchField
                  label={text.publishedLabel}
                  description={text.publishedHint}
                  checked={fields.published}
                  onCheckedChange={(checked) => update({ published: checked })}
                />

                <div className="grid gap-4 md:grid-cols-2">
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
                  <DashboardField label={text.paidAtLabel} hint={text.paidAtHint}>
                    <DateTimePicker
                      mode="date"
                      value={fields.paidAt}
                      onChange={(value) => update({ paidAt: value })}
                    />
                  </DashboardField>
                </div>
              </div>
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
          <CancelActionButton label={common.cancel} onClick={onClose} />
          <SaveActionButton
            onClick={handleSave}
            disabled={!fields || isPending}
            busy={isPending}
            label={isPending ? common.saving : common.save}
          />
        </OverlayCard.Footer>
      </OverlayCard>

      <AlertDialog
        open={pictureMissing}
        title={text.imageLabel}
        onClose={() => setPictureMissing(false)}
        buttonLabel={common.close}
      >
        {text.noPictureFound}
      </AlertDialog>

      <DeleteConfirmDialog
        open={confirmDelete}
        title={text.deleteTitle}
        description={text.deleteMessage}
        cancelLabel={common.cancel}
        deleteLabel={common.delete}
        isPending={remove.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (!sponsorId) return;
          // The question has been answered, so it goes before the editor does.
          // Closing only the editor leaves the dialogue standing over whatever
          // is behind it, asking about a sponsor that is already gone.
          remove.mutate(sponsorId, {
            onSuccess: () => {
              setConfirmDelete(false);
              onClose();
            },
          });
        }}
      />
    </>
  );
}
