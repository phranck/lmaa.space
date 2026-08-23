import type { SocialMediaEditorMessages } from "@lmaa/ui";

import type { DashboardLocale } from "@/i18n/messages.ts";

const MESSAGES: Record<DashboardLocale, SocialMediaEditorMessages> = {
  de: {
    urlPlaceholder: "URL einfügen",
    addAriaLabel: "Link hinzufügen",
    removeAriaLabel: "Link entfernen",
    openAriaLabel: "Link öffnen",
    selectPlatformAriaLabel: "Plattform wählen",
    invalidUrlMessage: (platformLabel) => `Ungültige ${platformLabel}-URL.`,
  },
  en: {
    urlPlaceholder: "Paste URL",
    addAriaLabel: "Add link",
    removeAriaLabel: "Remove link",
    openAriaLabel: "Open link",
    selectPlatformAriaLabel: "Select platform",
    invalidUrlMessage: (platformLabel) => `Invalid ${platformLabel} URL.`,
  },
};

/**
 * Returns the copy the shared social media editor needs.
 *
 * Every form that carries such an editor reads it from here, so the shop form
 * and the sponsor form cannot end up saying two different things about the same
 * control.
 *
 * @param locale - Active dashboard locale.
 * @returns The message bundle for that locale.
 */
export function getSocialMediaEditorMessages(locale: DashboardLocale): SocialMediaEditorMessages {
  return MESSAGES[locale];
}
