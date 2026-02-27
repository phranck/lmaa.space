import type { DashboardLocale } from "@/i18n/messages.ts";
import { type ShopEditFormMessages, createRegionOptions } from "@lmaa/ui";

const REGION_NAMES = {
  de: {
    DE: "Deutschland",
    AT: "Österreich",
    CH: "Schweiz",
    EU: "Europa",
  },
  en: {
    DE: "Germany",
    AT: "Austria",
    CH: "Switzerland",
    EU: "Europe",
  },
} as const;

/**
 * Returns localized region options for the shop editor.
 *
 * @param locale - Active dashboard locale.
 * @returns Region option list for select controls.
 */
export function getRegionOptions(locale: DashboardLocale) {
  return createRegionOptions(REGION_NAMES[locale]);
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
        categorySelect: {
          selectAll: "(Select all)",
          clearAllAriaLabel: "Clear all selected categories",
          clearSelectionAriaLabel: "Remove selected category",
          moreSelected: (count) => `+ ${count} more`,
        },
        regionSelect: {
          label: "Region",
          placeholder: "Select region…",
          infoAriaLabel: "Info about region selection",
          infoTitle: "What does region mean?",
          infoDescription:
            "Indicates whether this shop has a dedicated website for a specific region. Germany, Austria, and Switzerland are often indicated by the TLD (.de, .at, .ch). Europe can also use .com, .biz, or other international domains.",
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
      categorySelect: {
        selectAll: "(Alle auswählen)",
        clearAllAriaLabel: "Alle ausgewählten Kategorien entfernen",
        clearSelectionAriaLabel: "Ausgewählte Kategorie entfernen",
        moreSelected: (count) => `+ ${count} weitere`,
      },
      regionSelect: {
        label: "Region",
        placeholder: "Region wählen…",
        infoAriaLabel: "Info zur Regionauswahl",
        infoTitle: "Was bedeutet Region?",
        infoDescription:
          "Gibt an, ob dieser Shop eine eigene Website für die jeweilige Region hat. Bei Deutschland, Österreich und der Schweiz ist das meist an der TLD erkennbar (.de, .at, .ch). Bei Europa können auch .com, .biz oder andere internationale Domains genutzt werden.",
      },
    },
    regionOptions,
  };
}
