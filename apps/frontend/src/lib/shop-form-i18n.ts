import { type ShopEditFormMessages, createRegionOptions } from "@lmaa/ui";

/**
 * Supported locales for the public suggestion form.
 */
type FrontendLocale = "de" | "en";

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
 * Returns localized labels and region options for the public shop form.
 *
 * @param locale - Target locale, defaults to German.
 * @returns Translated message bundle plus computed region options.
 */
export function getFrontendShopFormI18n(locale: FrontendLocale = "de"): {
  messages: ShopEditFormMessages;
  regionOptions: ReturnType<typeof createRegionOptions>;
} {
  const regionOptions = createRegionOptions(REGION_NAMES[locale]);

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
      },
    },
    regionOptions,
  };
}
