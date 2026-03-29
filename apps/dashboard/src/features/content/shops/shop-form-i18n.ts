import {
  type ShopEditFormMessages,
  createDefaultCountryCodeOptions,
  createDefaultRegionOptions,
} from "@lmaa/ui";

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
  countryCodeOptions: ReturnType<typeof createDefaultCountryCodeOptions>;
  regionOptions: ReturnType<typeof getRegionOptions>;
} {
  const regionOptions = getRegionOptions(locale);
  const countryCodeOptions = createDefaultCountryCodeOptions(locale);

  if (locale === "en") {
    return {
      messages: {
        shopDataSectionLabel: "Shop Data",
        nameLabel: "Shop name",
        urlLabel: "URL",
        urlPlaceholder: "https://…",
        openUrlAriaLabel: "Open URL",
        descriptionLabel: "Description",
        optionalLabel: "(optional)",
        markdownSupportedLabel: "Markdown is supported",
        categoriesLabel: "Categories",
        categoriesPlaceholder: "Select categories…",
        shippingSectionLabel: "Shipping",
        shippingLabel: "Note",
        shippingPlaceholder: "e.g. Free shipping from €50",
        contactEmailLabel: "Contact Email",
        contactEmailPlaceholder: "e.g. info@example.com",
        headquartersLabel: "Headquarters",
        streetLabel: "Street",
        streetPlaceholder: "e.g. Main Street 1",
        postalCodeLabel: "Postal Code",
        postalCodePlaceholder: "e.g. 10115",
        cityLabel: "City",
        cityPlaceholder: "e.g. Berlin",
        countryCodeLabel: "Country",
        countryCodePlaceholder: "e.g. DE",
        latitudeLabel: "Latitude",
        latitudePlaceholder: "e.g. 52.5200",
        longitudeLabel: "Longitude",
        longitudePlaceholder: "e.g. 13.4050",
        jsonToolTitle: "JSON from Shop-Check Skill",
        jsonApplyLabel: "Apply JSON",
        jsonImportFileLabel: "Import JSON",
        jsonImportError: "JSON could not be mapped to the form.",
        jsonInvalidError: "Invalid JSON.",
        mapStandardLabel: "Standard",
        mapSatelliteLabel: "Satellite",
        socialMediaLabel: "Social Media",
        socialMedia: {
          urlPlaceholder: "Paste URL",
          addAriaLabel: "Add link",
          removeAriaLabel: "Remove link",
          openAriaLabel: "Open link",
          selectPlatformAriaLabel: "Select platform",
          invalidUrlMessage: (platformLabel) => `Invalid ${platformLabel} URL.`,
        },
        categorySelect: {
          selectAll: "(Select all)",
          clearAllAriaLabel: "Clear all selected categories",
          clearSelectionAriaLabel: "Remove selected category",
          moreSelected: (count) => `+ ${count} more`,
          searchPlaceholder: "Search…",
        },
        regionSelect: {
          label: "Regions",
          placeholder: "Select regions…",
        },
      },
      countryCodeOptions,
      regionOptions,
    };
  }

  return {
    messages: {
      shopDataSectionLabel: "Shop-Daten",
      nameLabel: "Name",
      urlLabel: "URL",
      urlPlaceholder: "https://…",
      openUrlAriaLabel: "URL öffnen",
      descriptionLabel: "Beschreibung",
      optionalLabel: "(optional)",
      markdownSupportedLabel: "Markdown wird unterstützt",
      categoriesLabel: "Kategorien",
      categoriesPlaceholder: "Kategorie wählen…",
      shippingSectionLabel: "Versand",
      shippingLabel: "Notiz",
      shippingPlaceholder: "z.B. Kostenlos ab 50 €",
      contactEmailLabel: "Kontakt-E-Mail",
      contactEmailPlaceholder: "z.B. info@beispiel.de",
      headquartersLabel: "Anschrift",
      streetLabel: "Straße",
      streetPlaceholder: "z.B. Musterstraße 1",
      postalCodeLabel: "PLZ",
      postalCodePlaceholder: "z.B. 10115",
      cityLabel: "Ort",
      cityPlaceholder: "z.B. Berlin",
      countryCodeLabel: "Ländercode",
      countryCodePlaceholder: "z.B. DE",
      latitudeLabel: "Breitengrad",
      latitudePlaceholder: "z.B. 52.5200",
      longitudeLabel: "Längengrad",
      longitudePlaceholder: "z.B. 13.4050",
      jsonToolTitle: "JSON aus Shop-Check Skill",
      jsonApplyLabel: "Aus JSON übernehmen",
      jsonImportFileLabel: "JSON importieren",
      jsonImportError: "Das JSON konnte nicht auf das Formular abgebildet werden.",
      jsonInvalidError: "Ungültiges JSON.",
      mapStandardLabel: "Standard",
      mapSatelliteLabel: "Satellit",
      socialMediaLabel: "Social Media",
      socialMedia: {
        urlPlaceholder: "URL einfügen",
        addAriaLabel: "Link hinzufügen",
        removeAriaLabel: "Link entfernen",
        openAriaLabel: "Link öffnen",
        selectPlatformAriaLabel: "Plattform wählen",
        invalidUrlMessage: (platformLabel) => `Ungültige ${platformLabel}-URL.`,
      },
      categorySelect: {
        selectAll: "(Alle auswählen)",
        clearAllAriaLabel: "Alle ausgewählten Kategorien entfernen",
        clearSelectionAriaLabel: "Ausgewählte Kategorie entfernen",
        moreSelected: (count) => `+ ${count} weitere`,
        searchPlaceholder: "Suchen…",
      },
      regionSelect: {
        label: "Regionen",
        placeholder: "Regionen wählen…",
      },
    },
    countryCodeOptions,
    regionOptions,
  };
}
