import { type ShopEditFormMessages, createDefaultRegionOptions } from "@lmaa/ui";

import type { DashboardLocale } from "@/i18n/messages.ts";

/**
 * Returns localized region options for the shop editor.
 *
 * @param locale - Active dashboard locale.
 * @returns Region option list for select controls.
 */
export function getRegionOptions(locale: DashboardLocale) {
  return createDefaultRegionOptions(locale);
}

/**
 * Returns localized copy for the shared shop edit form component.
 *
 * @param locale - Active dashboard locale.
 * @returns Message bundle and region options.
 */
export function getShopEditFormI18n(locale: DashboardLocale): {
  messages: ShopEditFormMessages;
  regionOptions: ReturnType<typeof getRegionOptions>;
} {
  const regionOptions = getRegionOptions(locale);

  if (locale === "en") {
    return {
      messages: {
        nameLabel: "Shop name",
        urlLabel: "URL",
        urlPlaceholder: "https://…",
        openUrlAriaLabel: "Open URL",
        descriptionLabel: "Description",
        optionalLabel: "(optional)",
        markdownSupportedLabel: "Markdown is supported",
        categoriesLabel: "Categories",
        categoriesPlaceholder: "Select categories…",
        shippingLabel: "Shipping",
        shippingPlaceholder: "e.g. Free shipping from €50",
        contactEmailLabel: "Contact Email",
        contactEmailPlaceholder: "e.g. info@example.com",
        socialMediaLabel: "Social Media",
        socialMedia: {
          urlPlaceholder: "Paste URL",
          addAriaLabel: "Add link",
          removeAriaLabel: "Remove link",
          selectPlatformAriaLabel: "Select platform",
        },
        categorySelect: {
          selectAll: "(Select all)",
          clearAllAriaLabel: "Clear all selected categories",
          clearSelectionAriaLabel: "Remove selected category",
          moreSelected: (count) => `+ ${count} more`,
        },
        regionSelect: {
          label: "Shipping Regions",
          placeholder: "Select shipping regions…",
        },
      },
      regionOptions,
    };
  }

  return {
    messages: {
      nameLabel: "Shop-Name",
      urlLabel: "URL",
      urlPlaceholder: "https://…",
      openUrlAriaLabel: "URL öffnen",
      descriptionLabel: "Beschreibung",
      optionalLabel: "(optional)",
      markdownSupportedLabel: "Markdown wird unterstützt",
      categoriesLabel: "Kategorien",
      categoriesPlaceholder: "Kategorie wählen…",
      shippingLabel: "Versand",
      shippingPlaceholder: "z.B. Kostenlos ab 50 €",
      contactEmailLabel: "Kontakt-E-Mail",
      contactEmailPlaceholder: "z.B. info@beispiel.de",
      socialMediaLabel: "Social Media",
      socialMedia: {
        urlPlaceholder: "URL einfügen",
        addAriaLabel: "Link hinzufügen",
        removeAriaLabel: "Link entfernen",
        selectPlatformAriaLabel: "Plattform wählen",
      },
      categorySelect: {
        selectAll: "(Alle auswählen)",
        clearAllAriaLabel: "Alle ausgewählten Kategorien entfernen",
        clearSelectionAriaLabel: "Ausgewählte Kategorie entfernen",
        moreSelected: (count) => `+ ${count} weitere`,
      },
      regionSelect: {
        label: "Versand-Regionen",
        placeholder: "Versand-Regionen wählen…",
      },
    },
    regionOptions,
  };
}
