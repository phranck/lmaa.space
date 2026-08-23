import { createDefaultCountryCodeOptions } from "@lmaa/ui/country-code-select";
import { createDefaultRegionOptions } from "@lmaa/ui/region-select";
import { type ShopEditFormMessages } from "@lmaa/ui/shop-edit-form";

import type { DashboardLocale } from "@/i18n/messages.ts";
import { getSocialMediaEditorMessages } from "@/i18n/social-media-editor.ts";

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
        geocodeButtonLabel: "Geocode",
        geocodingErrorTitle: "Geocoding failed",
        geocodingNoResultsLabel: "No coordinates could be found for the entered address.",
        geocodingFetchErrorLabel: "The geocoding request failed. Please try again.",
        jsonToolTitle: "JSON from Shop-Check Skill",
        jsonApplyLabel: "Apply JSON",
        jsonImportFileLabel: "Import JSON",
        jsonImportError: "JSON could not be mapped to the form.",
        jsonInvalidError: "Invalid JSON.",
        mapStandardLabel: "Standard",
        mapSatelliteLabel: "Satellite",
        socialMediaLabel: "Social Media",
        socialMedia: getSocialMediaEditorMessages("en"),
        shopCheckNotesSectionLabel: "Shopcheck Notes",
        shopCheckFocusLabel: "Focus",
        shopCheckFocusPlaceholder: "e.g. sustainable fashion\nlocal production\ncustom prints",
        shopCheckCompanyPresentationLabel: "Company note",
        shopCheckCompanyPresentationPlaceholder:
          "Editorial context from the shop check, without turning the public description into a fact list.",
        shopCheckBrandsSectionLabel: "Brands & Products",
        shopCheckBrandsLabel: "Brands or products",
        shopCheckBrandsPlaceholder: "e.g. Stanley/Stella\nB&C\norganic cotton shirts",
        shopCheckListHelpLabel:
          "One entry per line. These values are stored and included in search.",
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
        paymentMethodsLabel: "Payment methods",
        paymentMethods: {
          locale: "en",
          placeholder: "Select payment methods…",
          selectAll: "(Select all)",
          clearAllAriaLabel: "Clear all payment methods",
          clearSelectionAriaLabel: "Remove payment method",
          moreSelected: (count) => `+ ${count} more`,
          searchPlaceholder: "Search…",
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
      geocodeButtonLabel: "Geocode",
      geocodingErrorTitle: "Geocoding fehlgeschlagen",
      geocodingNoResultsLabel:
        "Für die eingegebene Adresse konnten keine Koordinaten gefunden werden.",
      geocodingFetchErrorLabel:
        "Die Geocoding-Anfrage ist fehlgeschlagen. Bitte versuche es erneut.",
      jsonToolTitle: "JSON aus Shop-Check Skill",
      jsonApplyLabel: "Aus JSON übernehmen",
      jsonImportFileLabel: "JSON importieren",
      jsonImportError: "Das JSON konnte nicht auf das Formular abgebildet werden.",
      jsonInvalidError: "Ungültiges JSON.",
      mapStandardLabel: "Standard",
      mapSatelliteLabel: "Satellit",
      socialMediaLabel: "Social Media",
      socialMedia: getSocialMediaEditorMessages("de"),
      shopCheckNotesSectionLabel: "Shopcheck-Notizen",
      shopCheckFocusLabel: "Fokus",
      shopCheckFocusPlaceholder: "z.B. nachhaltige Mode\nlokale Produktion\nindividuelle Prints",
      shopCheckCompanyPresentationLabel: "Unternehmensnotiz",
      shopCheckCompanyPresentationPlaceholder:
        "Redaktioneller Kontext aus dem Shopcheck, ohne die öffentliche Beschreibung zur Faktensammlung zu machen.",
      shopCheckBrandsSectionLabel: "Brands & Produkte",
      shopCheckBrandsLabel: "Brands oder Produkte",
      shopCheckBrandsPlaceholder: "z.B. Stanley/Stella\nB&C\nBio-Baumwollshirts",
      shopCheckListHelpLabel:
        "Ein Eintrag pro Zeile. Diese Werte werden gespeichert und in der Suche berücksichtigt.",
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
      paymentMethodsLabel: "Zahlungsarten",
      paymentMethods: {
        locale: "de",
        placeholder: "Zahlungsarten wählen…",
        selectAll: "(Alle auswählen)",
        clearAllAriaLabel: "Alle Zahlungsarten entfernen",
        clearSelectionAriaLabel: "Zahlungsart entfernen",
        moreSelected: (count) => `+ ${count} weitere`,
        searchPlaceholder: "Suchen…",
      },
    },
    countryCodeOptions,
    regionOptions,
  };
}
