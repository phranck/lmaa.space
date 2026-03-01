/**
 * Supported dashboard UI locales.
 */
export type DashboardLocale = "de" | "en";

/**
 * Complete translation contract consumed by dashboard views/components.
 */
export interface DashboardMessages {
  languageName: string;
  common: {
    ok: string;
    cancel: string;
    save: string;
    saving: string;
    edit: string;
    delete: string;
    remove: string;
    close: string;
    loading: string;
    unknownError: string;
  };
  layout: {
    menuOpen: string;
    menuClose: string;
    pageFallbackTitle: string;
    sidebar: {
      sectionGeneral: string;
      sectionContent: string;
      sectionTemplates: string;
      sectionSystem: string;
      overview: string;
      submissions: string;
      shops: string;
      categories: string;
      users: string;
      pages: string;
      pagesOverview: string;
      navigations: string;
      formBuilder: string;
      formsOverview: string;
      emailTemplates: string;
      emailTemplatesOverview: string;
      editProfile: string;
      logout: string;
      logoutConfirmTitle: string;
      logoutConfirmDescription: string;
      logoutConfirmAction: string;
      logoutSkipConfirm: string;
      logoutConfirmLabel: string;
      roles: {
        owner: string;
        admin: string;
        moderator: string;
      };
    };
  };
  auth: {
    logoAlt: string;
    adminArea: string;
    login: {
      title: string;
      username: string;
      password: string;
      invalidCredentials: string;
      submit: string;
      submitLoading: string;
    };
    setup: {
      welcome: string;
      title: string;
      subtitle: string;
      email: string;
      confirmPassword: string;
      passwordMismatch: string;
      genericError: string;
      submit: string;
      submitLoading: string;
    };
  };
  dashboard: {
    overviewTitle: string;
    cards: {
      shops: string;
      categories: string;
      pendingSuggestions: string;
      waitingForReview: string;
      suggestionsTotal: string;
      allTime: string;
      brokenLinks: string;
      shopsReported: string;
    };
    analytics: {
      title: string;
      noData: string;
      noRealtimeData: string;
      unknown: string;
      direct: string;
      home: string;
      visitors: string;
      pageviews: string;
      bounceRate: string;
      averageDuration: string;
      realtime: {
        title: string;
        active5m: string;
        pageviews30m: string;
        updatedEvery30s: string;
      };
      traffic: string;
      topPages: string;
      sources: string;
      environment: string;
      location: string;
      countries: string;
      regions: string;
      cities: string;
      country: string;
      region: string;
      city: string;
      browser: string;
      os: string;
      devices: string;
      device: string;
      percentColumn: string;
      umamiNotConfigured: string;
      periods: {
        today: string;
        d7: string;
        d30: string;
        d60: string;
        d90: string;
      };
      durationUnits: {
        secondsShort: string;
        minutesShort: string;
      };
    };
  };
  shops: {
    title: string;
    newShop: string;
    searchPlaceholder: string;
    noShops: string;
    noShopsHint: string;
    noResultsPrefix: string;
    noResultsHint: string;
    filters: {
      all: string;
      public: string;
      onhold: string;
      deleted: string;
    };
    table: {
      shop: string;
      categories: string;
      region: string;
      statusOnhold: string;
      statusDeleted: string;
      edit: string;
      putOnHold: string;
      restore: string;
      delete: string;
      deletionInfo: string;
      deletedBy: string;
      deletedAt: string;
      deletionReason: string;
      noReason: string;
      wasReported: string;
    };
    editCard: {
      titleSubmissionEdit: string;
      titleNew: string;
      titleEdit: string;
      previewImage: string;
      noImage: string;
      reloadImage: string;
      upload: string;
      unsplash: string;
      deleteImage: string;
      errorSaving: string;
    };
    deleteCard: {
      title: string;
      markedDeletedHint: string;
      reason: string;
      optional: string;
      markdownSupported: string;
      reasonPlaceholder: string;
      reportedLabel: string;
      modeLabel: string;
      markDeleted: string;
      deletePermanently: string;
      deleting: string;
      deleteShop: string;
    };
  };
  categories: {
    title: string;
    newCategory: string;
    empty: string;
    emptyHint: string;
    deleteTitle: string;
    deleteDescriptionSuffix: string;
    table: {
      name: string;
      slug: string;
      shops: string;
      edit: string;
      delete: string;
    };
    card: {
      shopSingular: string;
      shopPlural: string;
      edit: string;
      delete: string;
    };
    editCard: {
      titleNew: string;
      titleEdit: string;
      name: string;
      slug: string;
      description: string;
      upload: string;
      unsplash: string;
      deleteImage: string;
      errorSaving: string;
    };
    unsplash: {
      searchError: string;
      searchPlaceholder: string;
      closeAria: string;
      searchHint: string;
      emptyPrefix: string;
      addTitlePrefix: string;
    };
  };
  submissions: {
    title: string;
    tabs: {
      suggestions: string;
      deadLinks: string;
      shopReports: string;
    };
    status: {
      pending: string;
      onhold: string;
      approved: string;
      rejected: string;
    };
    sort: {
      oldFirst: string;
      newFirst: string;
    };
    suggestions: {
      nonePrefix: string;
      noneHint: string;
      reject: string;
      onhold: string;
      edit: string;
      approve: string;
      delete: string;
      confirmDeleteTitle: string;
      confirmDeleteDescription: string;
      feedbackToPrefix: string;
      reviewApproveTitle: string;
      reviewRejectTitle: string;
      comment: string;
      optional: string;
      rejectReasonPlaceholder: string;
      commentPlaceholder: string;
      reviewErrorPrefix: string;
      accept: string;
      decline: string;
      doneOrDecline: string;
    };
    deadLinks: {
      none: string;
      noneHint: string;
      reportedSuffix: string;
      keep: string;
      delete: string;
      confirmDeleteTitle: string;
      confirmDeleteDescription: string;
    };
    shopReports: {
      loading: string;
      none: string;
      noneHint: string;
      doneOrDecline: string;
      edit: string;
      delete: string;
    };
  };
  users: {
    title: string;
    inviteUser: string;
    you: string;
    role: {
      owner: string;
      admin: string;
      moderator: string;
    };
    editTitle: string;
    remove: string;
    removeConfirmTitle: string;
    removeConfirmDescription: string;
    createCard: {
      closeAria: string;
      title: string;
      role: string;
      username: string;
      email: string;
      tempPassword: string;
      minLengthHint: string;
      welcomeTemplate: string;
      welcomeTemplateNone: string;
      errorCreating: string;
      creating: string;
      create: string;
    };
    editCard: {
      title: string;
      uploadImage: string;
      useGravatar: string;
      removeAvatar: string;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      password: string;
      passwordPlaceholder: string;
      roleAdmin: string;
      roleModerator: string;
      errorSaving: string;
      editTooltip: string;
    };
  };
  content: {
    editor: {
      decreaseFontSize: string;
      increaseFontSize: string;
      deletePage: string;
      confirmDelete: string;
      confirmDeleteAction: string;
      saved: string;
      titleLabel: string;
      slugLabel: string;
      statusLabel: string;
      ok: string;
      statusDraft: string;
      statusPublished: string;
      statusHidden: string;
      createdBy: string;
      updatedBy: string;
      loadingContent: string;
      saveError: string;
    };
    linkPicker: {
      insertInternalLink: string;
      closeSelection: string;
      searchPlaceholder: string;
      noResults: string;
      groups: {
        static: string;
        pages: string;
        categories: string;
        forms: string;
      };
      staticRoutes: {
        homeCategories: string;
        suggestShop: string;
        search: string;
      };
    };
    loadingFallback: string;
    pages: {
      title: string;
      newPage: string;
      createTitle: string;
      fieldTitle: string;
      fieldSlug: string;
      titlePlaceholder: string;
      slugPlaceholder: string;
      create: string;
      creating: string;
      createError: string;
      confirmDeletePrefix: string;
      confirmDeleteSuffix: string;
      loadPages: string;
      emptyPages: string;
      emptyPagesHint: string;
      deletePageTitle: string;
      table: {
        title: string;
        slug: string;
        status: string;
        createdBy: string;
        updatedBy: string;
      };
      status: {
        published: string;
        hidden: string;
        draft: string;
      };
    };
  };
  formBuilder: {
    title: string;
    listTitle: string;
    newForm: string;
    formNameLabel: string;
    formSlugLabel: string;
    formSlugHint: string;
    create: string;
    backToList: string;
    slugLabel: string;
    slugPlaceholder: string;
    save: string;
    saved: string;
    saveError: string;
    empty: string;
    editButton: string;
    noForms: string;
    noFormsHint: string;
    slugConflict: string;
    nameConflict: string;
    noFieldSelected: string;
    noFieldSelectedHint: string;
    deleteConfirmPrefix: string;
    deleteConfirmSuffix: string;
    deleteConfirmDescription: string;
    tableColumns: {
      name: string;
      status: string;
    };
    status: {
      active: string;
      inactive: string;
      activate: string;
      deactivate: string;
    };
    paletteGroups: {
      standard: string;
      special: string;
    };
    fieldTypes: {
      text: string;
      email: string;
      textarea: string;
      select: string;
      multiSelect: string;
      categoriesSelect: string;
      regionsSelect: string;
      checkbox: string;
      richtext: string;
      button: string;
      password: string;
      headline: string;
      separator: string;
      paragraph: string;
    };
    panel: {
      label: string;
      fieldName: string;
      rows: string;
      placeholder: string;
      required: string;
      span: string;
      options: string;
      optionsHint: string;
      validationMin: string;
      validationMax: string;
      maxChars: string;
      subtext: string;
      content: string;
      variant: string;
      variantDefault: string;
      variantInfo: string;
      variantWarning: string;
      variantHint: string;
      buttonType: string;
      buttonTypeButton: string;
      buttonTypeSubmit: string;
      buttonTypeReset: string;
      buttonWidth: string;
      buttonWidthAutomatic: string;
      buttonWidthFull: string;
      buttonAlign: string;
      buttonAlignLeft: string;
      buttonAlignCenter: string;
      buttonAlignRight: string;
      buttonIcon: string;
      buttonIconNone: string;
      buttonDisplay: string;
      buttonDisplayText: string;
      buttonDisplayIcon: string;
      buttonDisplayBoth: string;
      headlineLevel: string;
      headlineLevelH1: string;
      headlineLevelH2: string;
      headlineLevelH3: string;
      buttonAction: string;
      buttonActionNone: string;
      buttonActionOpenUrl: string;
      buttonActionCopyClipboard: string;
      buttonActionClearField: string;
      buttonActionSourceField: string;
      inputType: string;
      inputTypeText: string;
      inputTypeEmail: string;
      inputTypePassword: string;
      inputTypeUrl: string;
      inputTypeTel: string;
      inputTypeDate: string;
      inputTypeNumber: string;
      separatorNoSettings: string;
      loadingEditor: string;
      validation: string;
      spanAriaOf: string;
      iconPickerVariantOutline: string;
      iconPickerVariantFilled: string;
      iconPickerSearch: string;
      iconPickerEmpty: string;
    };
    submission: {
      title: string;
      addStep: string;
      addStepButton: string;
      stepStore: string;
      stepEmail: string;
      stepCreateShopSuggestion: string;
      stepMoveAria: string;
      stepRemoveAria: string;
      emailTo: string;
      emailToStatic: string;
      emailToFromField: string;
      emailSubject: string;
      emailSubjectPlaceholder: string;
      emailTemplate: string;
      emailTemplateNone: string;
      successBehaviourLabel: string;
      successMessage: string;
      successHeadline: string;
      successHeadlinePlaceholder: string;
      successMessagePlaceholder: string;
      successRedirect: string;
      noSteps: string;
    };
    exportForm: string;
    exportAll: string;
    importForm: string;
    importSuccess: string;
    importError: string;
    importInvalidFile: string;
    importConflictTitle: string;
    importConflictHint: string;
    importOverwrite: string;
    importRename: string;
    importNewNameLabel: string;
    importSkip: string;
    exportUnsavedWarning: string;
  };
  emailTemplates: {
    listTitle: string;
    newTemplate: string;
    editTemplate: string;
    templateName: string;
    templateSubject: string;
    subjectPlaceholder: string;
    headerBanner: string;
    headerText: string;
    bodyText: string;
    footerBanner: string;
    footerText: string;
    deleteTemplate: string;
    deleteTemplateConfirm: string;
    noTemplates: string;
    noTemplatesHint: string;
    backToList: string;
    save: string;
    saved: string;
    saveError: string;
    nameConflict: string;
    systemBadge: string;
    tableCreated: string;
    preview: string;
    previewTitle: string;
    sectionHeader: string;
    sectionBody: string;
    sectionFooter: string;
    importTemplate: string;
    exportTemplate: string;
    exportAll: string;
    importSuccess: string;
    importError: string;
    importInvalidFile: string;
    importConflictTitle: string;
    importConflictHint: string;
    importOverwrite: string;
    importRename: string;
    importSkip: string;
    importNewNameLabel: string;
  };
  errors: {
    boundary: {
      title: string;
      fallbackMessage: string;
      reload: string;
      retry: string;
    };
  };
}

/**
 * Dashboard translation bundle keyed by locale.
 */
export const DASHBOARD_MESSAGES: Record<DashboardLocale, DashboardMessages> = {
  de: {
    languageName: "Deutsch",
    common: {
      ok: "OK",
      cancel: "Abbrechen",
      save: "Speichern",
      saving: "Wird gespeichert…",
      edit: "Bearbeiten",
      delete: "Löschen",
      remove: "Entfernen",
      close: "Schließen",
      loading: "Lade…",
      unknownError: "Unbekannter Fehler",
    },
    layout: {
      menuOpen: "Menü öffnen",
      menuClose: "Menü schließen",
      pageFallbackTitle: "lmaa.space",
      sidebar: {
        sectionGeneral: "Allgemein",
        sectionContent: "Content",
        sectionTemplates: "Templates",
        sectionSystem: "System",
        overview: "Übersicht",
        submissions: "Meldungen",
        shops: "Shops",
        categories: "Kategorien",
        users: "Benutzer",
        pages: "Seiten",
        pagesOverview: "Übersicht",
        navigations: "Navigationen",
        formBuilder: "Formular-Builder",
        formsOverview: "Übersicht",
        emailTemplates: "E-Mail-Templates",
        emailTemplatesOverview: "Übersicht",
        editProfile: "Profil bearbeiten",
        logout: "Abmelden",
        logoutConfirmTitle: "Abmelden?",
        logoutConfirmDescription: "Wirklich vom Dashboard abmelden?",
        logoutConfirmAction: "Abmelden",
        logoutSkipConfirm: "Beim nächsten Mal nicht mehr fragen",
        logoutConfirmLabel: "Logout-Bestätigung",
        roles: {
          owner: "Owner",
          admin: "Admin",
          moderator: "Moderator",
        },
      },
    },
    auth: {
      logoAlt: "lmaa.space",
      adminArea: "Admin-Bereich",
      login: {
        title: "Anmelden",
        username: "Benutzername",
        password: "Passwort",
        invalidCredentials: "Ungültige Zugangsdaten.",
        submit: "Anmelden",
        submitLoading: "Anmelden...",
      },
      setup: {
        welcome: "Willkommen!",
        title: "Admin einrichten",
        subtitle: "Erstelle den ersten Admin-Account für lmaa.space.",
        email: "E-Mail",
        confirmPassword: "Passwort bestätigen",
        passwordMismatch: "Passwörter stimmen nicht überein.",
        genericError: "Fehler beim Setup.",
        submit: "Admin-Account erstellen",
        submitLoading: "Wird eingerichtet...",
      },
    },
    dashboard: {
      overviewTitle: "Übersicht",
      cards: {
        shops: "Shops",
        categories: "Kategorien",
        pendingSuggestions: "Offene Vorschläge",
        waitingForReview: "Warten auf Review",
        suggestionsTotal: "Vorschläge gesamt",
        allTime: "aller Zeiten",
        brokenLinks: "Defekte Links",
        shopsReported: "Shops gemeldet",
      },
      analytics: {
        title: "Analytics",
        noData: "Keine Daten",
        noRealtimeData: "Keine Realtime-Daten",
        unknown: "(Unbekannt)",
        direct: "(Direkt)",
        home: "Startseite",
        visitors: "Besucher",
        pageviews: "Seitenaufrufe",
        bounceRate: "Absprungrate",
        averageDuration: "Ø Verweildauer",
        realtime: {
          title: "Live",
          active5m: "aktiv (5 min)",
          pageviews30m: "Aufrufe (30 min)",
          updatedEvery30s: "aktualisiert alle 30 s",
        },
        traffic: "Traffic",
        topPages: "Top Seiten",
        sources: "Quellen",
        environment: "Environment",
        location: "Location",
        countries: "Länder",
        regions: "Regionen",
        cities: "Städte",
        country: "Land",
        region: "Region",
        city: "Stadt",
        browser: "Browser",
        os: "OS",
        devices: "Geräte",
        device: "Gerät",
        percentColumn: "%",
        umamiNotConfigured:
          "Umami nicht konfiguriert (UMAMI_URL, UMAMI_USERNAME, UMAMI_PASSWORD, UMAMI_WEBSITE_ID).",
        periods: {
          today: "Heute",
          d7: "7 Tage",
          d30: "30 Tage",
          d60: "60 Tage",
          d90: "90 Tage",
        },
        durationUnits: {
          secondsShort: "s",
          minutesShort: "m",
        },
      },
    },
    shops: {
      title: "Shops",
      newShop: "Neuer Shop",
      searchPlaceholder: "Suchen…",
      noShops: "Keine Shops gefunden.",
      noShopsHint: "Füge deinen ersten Shop über den +-Button hinzu.",
      noResultsPrefix: "Keine Treffer für",
      noResultsHint: "Versuche einen anderen Suchbegriff.",
      filters: {
        all: "Alle",
        public: "Öffentlich",
        onhold: "Zurückgestellt",
        deleted: "Gelöscht",
      },
      table: {
        shop: "Shop",
        categories: "Kategorien",
        region: "Region",
        statusOnhold: "zurückgestellt",
        statusDeleted: "gelöscht",
        edit: "Bearbeiten",
        putOnHold: "Zurückstellen",
        restore: "Wiederherstellen",
        delete: "Löschen",
        deletionInfo: "Löschdetails",
        deletedBy: "Gelöscht von",
        deletedAt: "Gelöscht am",
        deletionReason: "Begründung",
        noReason: "Kein Grund angegeben",
        wasReported: "Shop wurde gemeldet",
      },
      editCard: {
        titleSubmissionEdit: "Vorschlag bearbeiten",
        titleNew: "Neuer Shop",
        titleEdit: "Shop bearbeiten",
        previewImage: "Vorschaubild",
        noImage: "Kein Bild gesetzt",
        reloadImage: "Neu laden",
        upload: "Hochladen",
        unsplash: "Unsplash",
        deleteImage: "Löschen",
        errorSaving: "Fehler beim Speichern.",
      },
      deleteCard: {
        title: "Shop löschen",
        markedDeletedHint: "wird als gelöscht markiert und ist öffentlich nicht mehr sichtbar.",
        reason: "Begründung",
        optional: "(optional)",
        markdownSupported: "Markdown unterstützt",
        reasonPlaceholder: "Warum wird dieser Shop entfernt?",
        reportedLabel: "Shop wurde gemeldet (Dead-Link oder Shop-Meldung)",
        modeLabel: "Löschmodus",
        markDeleted: "Als gelöscht markieren",
        deletePermanently: "Löschen",
        deleting: "Wird gelöscht…",
        deleteShop: "Shop löschen",
      },
    },
    categories: {
      title: "Kategorien",
      newCategory: "Neue Kategorie",
      empty: "Noch keine Kategorien vorhanden.",
      emptyHint: "Erstelle deine erste Kategorie über den +-Button.",
      deleteTitle: "Kategorie löschen?",
      deleteDescriptionSuffix:
        "wird dauerhaft gelöscht. Alle zugeordneten Shops verlieren ihre Kategorie.",
      table: {
        name: "Name",
        slug: "Slug",
        shops: "Shops",
        edit: "Bearbeiten",
        delete: "Löschen",
      },
      card: {
        shopSingular: "Shop",
        shopPlural: "Shops",
        edit: "Bearbeiten",
        delete: "Löschen",
      },
      editCard: {
        titleNew: "Neue Kategorie",
        titleEdit: "Kategorie bearbeiten",
        name: "Name",
        slug: "Slug",
        description: "Beschreibung",
        upload: "Hochladen",
        unsplash: "Unsplash",
        deleteImage: "Löschen",
        errorSaving: "Fehler beim Speichern.",
      },
      unsplash: {
        searchError: "Fehler bei der Suche",
        searchPlaceholder: "Suchbegriff eingeben…",
        closeAria: "Schließen",
        searchHint: "Suchbegriff eingeben, um Bilder zu finden",
        emptyPrefix: "Keine Bilder gefunden für",
        addTitlePrefix: "Foto von",
      },
    },
    submissions: {
      title: "Meldungen",
      tabs: {
        suggestions: "Vorschläge",
        deadLinks: "Defekte Links",
        shopReports: "Shop-Meldungen",
      },
      status: {
        pending: "Offen",
        onhold: "Zurückgestellt",
        approved: "Angenommen",
        rejected: "Abgelehnt",
      },
      sort: {
        oldFirst: "Alte zuerst",
        newFirst: "Neue zuerst",
      },
      suggestions: {
        nonePrefix: "Keine",
        noneHint: "Sobald neue Vorschläge eingehen, erscheinen sie hier.",
        reject: "Ablehnen",
        onhold: "Zurückstellen",
        edit: "Bearbeiten",
        approve: "Annehmen",
        delete: "Löschen",
        confirmDeleteTitle: "Abgelehnten Vorschlag löschen?",
        confirmDeleteDescription: "wird dauerhaft entfernt.",
        feedbackToPrefix: "E-Mail-Feedback senden an",
        reviewApproveTitle: "Vorschlag annehmen",
        reviewRejectTitle: "Vorschlag ablehnen",
        comment: "Kommentar",
        optional: "(optional)",
        rejectReasonPlaceholder: "Grund für Ablehnung…",
        commentPlaceholder: "Optionaler Kommentar…",
        reviewErrorPrefix: "Fehler:",
        accept: "Annehmen",
        decline: "Ablehnen",
        doneOrDecline: "Erledigt / Ablehnen",
      },
      deadLinks: {
        none: "Keine gemeldeten defekten Links.",
        noneHint: "Alle gemeldeten Links sind erreichbar.",
        reportedSuffix: "× gemeldet",
        keep: "Belassen",
        delete: "Löschen",
        confirmDeleteTitle: "Shop wirklich löschen?",
        confirmDeleteDescription:
          "Der Shop wird dauerhaft entfernt und ist nicht mehr im Frontend sichtbar.",
      },
      shopReports: {
        loading: "Lade…",
        none: "Keine Shop-Meldungen.",
        noneHint: "Es liegen keine neuen Shop-Meldungen vor.",
        doneOrDecline: "Erledigt / Ablehnen",
        edit: "Bearbeiten",
        delete: "Löschen",
      },
    },
    users: {
      title: "Benutzer",
      inviteUser: "+ Benutzer einladen",
      you: "Du",
      role: {
        owner: "Owner",
        admin: "Admin",
        moderator: "Moderator",
      },
      editTitle: "Benutzer bearbeiten",
      remove: "Entfernen",
      removeConfirmTitle: "Benutzer entfernen?",
      removeConfirmDescription:
        "verliert den Admin-Zugang. Diese Aktion kann nicht rückgängig gemacht werden.",
      createCard: {
        closeAria: "Dialog schließen",
        title: "Neuen Benutzer anlegen",
        role: "Rolle",
        username: "Benutzername",
        email: "E-Mail",
        tempPassword: "Temporäres Passwort",
        minLengthHint: "Mindestens 8 Zeichen.",
        welcomeTemplate: "Willkommens-E-Mail",
        welcomeTemplateNone: "Keine E-Mail senden",
        errorCreating: "Fehler beim Erstellen.",
        creating: "Wird erstellt…",
        create: "Benutzer erstellen",
      },
      editCard: {
        title: "Benutzer bearbeiten",
        uploadImage: "Bild hochladen",
        useGravatar: "Gravatar verwenden",
        removeAvatar: "Entfernen",
        username: "Benutzername",
        email: "E-Mail",
        firstName: "Vorname",
        lastName: "Nachname",
        role: "Rolle",
        password: "Neues Passwort",
        passwordPlaceholder: "Nicht ändern",
        roleAdmin: "Admin",
        roleModerator: "Moderator",
        errorSaving: "Fehler beim Speichern.",
        editTooltip: "Bearbeiten",
      },
    },
    content: {
      editor: {
        decreaseFontSize: "Schriftgröße verkleinern",
        increaseFontSize: "Schriftgröße vergrößern",
        deletePage: "Seite löschen",
        confirmDelete: "Wirklich löschen?",
        confirmDeleteAction: "Ja, löschen",
        saved: "Gespeichert",
        titleLabel: "Titel",
        slugLabel: "Slug",
        statusLabel: "Status",
        ok: "OK",
        statusDraft: "Entwurf",
        statusPublished: "Veröffentlicht",
        statusHidden: "Versteckt",
        createdBy: "Erstellt von",
        updatedBy: "Geändert von",
        loadingContent: "Lade Inhalt…",
        saveError: "Fehler beim Speichern. Bitte erneut versuchen.",
      },
      linkPicker: {
        insertInternalLink: "Internen Link einfügen",
        closeSelection: "Link-Auswahl schließen",
        searchPlaceholder: "Seite oder Kategorie suchen…",
        noResults: "Keine Treffer",
        groups: {
          static: "Statisch",
          pages: "Seiten",
          categories: "Kategorien",
          forms: "Formulare",
        },
        staticRoutes: {
          homeCategories: "Startseite / Kategorien",
          suggestShop: "Shop vorschlagen",
          search: "Suche",
        },
      },
      loadingFallback: "Inhaltseditor wird geladen...",
      pages: {
        title: "Seiten",
        newPage: "Neue Seite",
        createTitle: "Neue Seite erstellen",
        fieldTitle: "Titel",
        fieldSlug: "Slug (URL-Pfad)",
        titlePlaceholder: "z.B. Über uns",
        slugPlaceholder: "about",
        create: "Erstellen",
        creating: "Wird erstellt…",
        createError: "Fehler beim Erstellen",
        confirmDeletePrefix: "Seite „",
        confirmDeleteSuffix: '" wirklich löschen?',
        loadPages: "Lade Seiten…",
        emptyPages: "Noch keine Seiten vorhanden.",
        emptyPagesHint: "Erstelle deine erste Seite über den +-Button.",
        deletePageTitle: "Seite löschen",
        table: {
          title: "Titel",
          slug: "Slug",
          status: "Status",
          createdBy: "Erstellt von",
          updatedBy: "Geändert von",
        },
        status: {
          published: "Veröffentlicht",
          hidden: "Versteckt",
          draft: "Entwurf",
        },
      },
    },
    formBuilder: {
      title: "Formular bearbeiten",
      listTitle: "Formulare",
      newForm: "Neues Formular",
      formNameLabel: "Name (intern, unveränderlich)",
      formSlugLabel: "URL-Pfad (Slug)",
      formSlugHint: "Wird auf der Website als Adresse verwendet (z.B. /mein-formular).",
      create: "Erstellen",
      backToList: "← Alle Formulare",
      slugLabel: "URL-Pfad (Slug)",
      slugPlaceholder: "z.B. mein-formular",
      save: "Speichern",
      saved: "Gespeichert",
      saveError: "Fehler beim Speichern. Bitte erneut versuchen.",
      empty: "Noch keine Felder vorhanden. Felder aus der Palette ziehen.",
      editButton: "Bearbeiten",
      noForms: "Noch keine Formulare vorhanden.",
      noFormsHint: "Erstelle dein erstes Formular über den +-Button.",
      slugConflict: "Dieser URL-Pfad wird bereits verwendet.",
      nameConflict: "Ein Formular mit diesem Namen existiert bereits.",
      noFieldSelected: "Kein Feld ausgewählt",
      noFieldSelectedHint: "Tippe auf ein Feld im Canvas, um es zu konfigurieren.",
      deleteConfirmPrefix: "Formular „",
      deleteConfirmSuffix: '" wirklich löschen?',
      deleteConfirmDescription: "Diese Aktion kann nicht rückgängig gemacht werden.",
      tableColumns: {
        name: "Name",
        status: "Status",
      },
      status: {
        active: "Aktiv",
        inactive: "Inaktiv",
        activate: "Aktivieren",
        deactivate: "Deaktivieren",
      },
      paletteGroups: {
        standard: "Felder",
        special: "Spezial",
      },
      fieldTypes: {
        text: "Input",
        email: "E-Mail",
        textarea: "Textbereich",
        select: "Auswahl",
        multiSelect: "Mehrfachauswahl",
        categoriesSelect: "Kategorien",
        regionsSelect: "Regionen",
        checkbox: "Checkbox",
        richtext: "Markdown Editor",
        button: "Button",
        password: "Input Passwort",
        headline: "Überschrift",
        separator: "Trennlinie",
        paragraph: "Textabsatz",
      },
      panel: {
        label: "Bezeichnung",
        fieldName: "Variablenname",
        rows: "Höhe (Zeilen)",
        placeholder: "Platzhalter",
        required: "Pflichtfeld",
        span: "Breite",
        options: "Optionen",
        optionsHint: "Eine Option pro Zeile",
        validationMin: "Min.",
        validationMax: "Max.",
        maxChars: "Maximale Zeichenanzahl",
        subtext: "Hilfstext",
        content: "Inhalt",
        variant: "Darstellung",
        variantDefault: "Standard",
        variantInfo: "Hinweis",
        variantWarning: "Warnung",
        variantHint: "Tipp",
        buttonType: "Typ",
        buttonTypeButton: "Button",
        buttonTypeSubmit: "Absenden",
        buttonTypeReset: "Zurücksetzen",
        buttonWidth: "Breite",
        buttonWidthAutomatic: "Automatisch",
        buttonWidthFull: "Volle Breite",
        buttonAlign: "Ausrichtung",
        buttonAlignLeft: "Links",
        buttonAlignCenter: "Mitte",
        buttonAlignRight: "Rechts",
        buttonIcon: "Icon",
        buttonIconNone: "Kein Icon",
        buttonDisplay: "Darstellung",
        buttonDisplayText: "Text",
        buttonDisplayIcon: "Icon",
        buttonDisplayBoth: "Beides",
        headlineLevel: "Ebene",
        headlineLevelH1: "H1 – Titel",
        headlineLevelH2: "H2 – Abschnitt",
        headlineLevelH3: "H3 – Unterabschnitt",
        buttonAction: "Aktion",
        buttonActionNone: "Keine",
        buttonActionOpenUrl: "URL öffnen",
        buttonActionCopyClipboard: "Kopieren",
        buttonActionClearField: "Feld leeren",
        buttonActionSourceField: "Quellfeld",
        inputType: "Input-Typ",
        inputTypeText: "Text",
        inputTypeEmail: "E-Mail",
        inputTypePassword: "Passwort",
        inputTypeUrl: "URL",
        inputTypeTel: "Telefon",
        inputTypeDate: "Datum",
        inputTypeNumber: "Zahl",
        separatorNoSettings: "Trennlinie hat keine weiteren Einstellungen.",
        loadingEditor: "Lade Editor…",
        validation: "Validierung",
        spanAriaOf: "von",
        iconPickerVariantOutline: "Outline",
        iconPickerVariantFilled: "Filled",
        iconPickerSearch: "Icons suchen…",
        iconPickerEmpty: "Keine Icons gefunden",
      },
      submission: {
        title: "Übermittlung",
        addStep: "Schritt auswählen",
        addStepButton: "Hinzufügen",
        stepStore: "Speichern",
        stepEmail: "E-Mail-Benachrichtigung",
        stepCreateShopSuggestion: "Shop-Vorschlag anlegen",
        stepMoveAria: "Schritt verschieben",
        stepRemoveAria: "Schritt entfernen",
        emailTo: "Empfänger",
        emailToStatic: "Statische Adresse",
        emailToFromField: "Aus Feld",
        emailSubject: "Betreff (optional)",
        emailSubjectPlaceholder: "Neue Formular-Übermittlung",
        emailTemplate: "E-Mail-Template",
        emailTemplateNone: "Kein Template (einfache Tabelle)",
        successBehaviourLabel: "Nach dem Absenden",
        successMessage: "Erfolgsmeldung",
        successHeadline: "Headline",
        successHeadlinePlaceholder: "Vielen Dank!",
        successMessagePlaceholder: "Vielen Dank für deine Nachricht!",
        successRedirect: "Weiterleitung",
        noSteps: "Keine Schritte konfiguriert.",
      },
      exportForm: "Exportieren",
      exportAll: "Alle exportieren",
      importForm: "Importieren",
      importSuccess: "{n} Formular(e) erfolgreich importiert",
      importError: "Fehler beim Importieren",
      importInvalidFile: "Ungültige Datei",
      importConflictTitle: "Namenskonflikt: {name}",
      importConflictHint: "Ein Formular mit diesem Namen existiert bereits.",
      importOverwrite: "Überschreiben",
      importRename: "Neuer Name",
      importNewNameLabel: "Neuer Name",
      importSkip: "Überspringen",
      exportUnsavedWarning: "Bitte zuerst speichern, bevor du exportierst.",
    },
    emailTemplates: {
      listTitle: "E-Mail-Templates",
      newTemplate: "Neues Template",
      editTemplate: "Template bearbeiten",
      templateName: "Name",
      templateSubject: "Betreff",
      subjectPlaceholder: "Willkommen bei lmaa.space",
      headerBanner: "Header-Bild (URL)",
      headerText: "Header-Text",
      bodyText: "Inhalt",
      footerBanner: "Footer-Bild (URL)",
      footerText: "Footer-Text",
      deleteTemplate: "Template löschen",
      deleteTemplateConfirm: "Dieses Template wirklich löschen?",
      noTemplates: "Noch keine Templates vorhanden.",
      noTemplatesHint: "Erstelle dein erstes Template über den +-Button.",
      backToList: "← Alle Templates",
      save: "Speichern",
      saved: "Gespeichert",
      saveError: "Fehler beim Speichern. Bitte erneut versuchen.",
      nameConflict: "Ein Template mit diesem Namen existiert bereits.",
      systemBadge: "System",
      tableCreated: "Erstellt",
      preview: "Vorschau",
      previewTitle: "E-Mail-Vorschau",
      sectionHeader: "Header",
      sectionBody: "Body",
      sectionFooter: "Footer",
      importTemplate: "Template importieren",
      exportTemplate: "Exportieren",
      exportAll: "Alle exportieren",
      importSuccess: "{n} Template(s) erfolgreich importiert.",
      importError: "Fehler beim Import.",
      importInvalidFile: "Ungültige Datei.",
      importConflictTitle: "Konflikt: {name}",
      importConflictHint: "Ein Template mit diesem Namen existiert bereits.",
      importOverwrite: "Überschreiben",
      importRename: "Umbenennen",
      importSkip: "Überspringen",
      importNewNameLabel: "Neuer Name",
    },
    errors: {
      boundary: {
        title: "Ein Fehler ist aufgetreten",
        fallbackMessage: "Ein unerwarteter Fehler in der Verwaltungsanwendung",
        reload: "Dashboard neuladen",
        retry: "Erneut versuchen",
      },
    },
  },
  en: {
    languageName: "English",
    common: {
      ok: "OK",
      cancel: "Cancel",
      save: "Save",
      saving: "Saving…",
      edit: "Edit",
      delete: "Delete",
      remove: "Remove",
      close: "Close",
      loading: "Loading…",
      unknownError: "Unknown error",
    },
    layout: {
      menuOpen: "Open menu",
      menuClose: "Close menu",
      pageFallbackTitle: "lmaa.space",
      sidebar: {
        sectionGeneral: "General",
        sectionContent: "Content",
        sectionTemplates: "Templates",
        sectionSystem: "System",
        overview: "Overview",
        submissions: "Reports",
        shops: "Shops",
        categories: "Categories",
        users: "Users",
        pages: "Pages",
        pagesOverview: "Overview",
        navigations: "Navigations",
        formBuilder: "Form Builder",
        formsOverview: "Overview",
        emailTemplates: "Email Templates",
        emailTemplatesOverview: "Overview",
        editProfile: "Edit profile",
        logout: "Log out",
        logoutConfirmTitle: "Log out?",
        logoutConfirmDescription: "Really log out of the dashboard?",
        logoutConfirmAction: "Log out",
        logoutSkipConfirm: "Don't ask next time",
        logoutConfirmLabel: "Logout confirmation",
        roles: {
          owner: "Owner",
          admin: "Admin",
          moderator: "Moderator",
        },
      },
    },
    auth: {
      logoAlt: "lmaa.space",
      adminArea: "Admin area",
      login: {
        title: "Sign in",
        username: "Username",
        password: "Password",
        invalidCredentials: "Invalid credentials.",
        submit: "Sign in",
        submitLoading: "Signing in...",
      },
      setup: {
        welcome: "Welcome!",
        title: "Set up admin",
        subtitle: "Create the first admin account for lmaa.space.",
        email: "Email",
        confirmPassword: "Confirm password",
        passwordMismatch: "Passwords do not match.",
        genericError: "Setup failed.",
        submit: "Create admin account",
        submitLoading: "Setting up...",
      },
    },
    dashboard: {
      overviewTitle: "Overview",
      cards: {
        shops: "Shops",
        categories: "Categories",
        pendingSuggestions: "Open suggestions",
        waitingForReview: "Waiting for review",
        suggestionsTotal: "Suggestions total",
        allTime: "all time",
        brokenLinks: "Broken links",
        shopsReported: "Shops reported",
      },
      analytics: {
        title: "Analytics",
        noData: "No data",
        noRealtimeData: "No realtime data",
        unknown: "(Unknown)",
        direct: "(Direct)",
        home: "Home",
        visitors: "Visitors",
        pageviews: "Pageviews",
        bounceRate: "Bounce rate",
        averageDuration: "Avg. visit duration",
        realtime: {
          title: "Live",
          active5m: "active (5 min)",
          pageviews30m: "Pageviews (30 min)",
          updatedEvery30s: "updated every 30 s",
        },
        traffic: "Traffic",
        topPages: "Top pages",
        sources: "Sources",
        environment: "Environment",
        location: "Location",
        countries: "Countries",
        regions: "Regions",
        cities: "Cities",
        country: "Country",
        region: "Region",
        city: "City",
        browser: "Browser",
        os: "OS",
        devices: "Devices",
        device: "Device",
        percentColumn: "%",
        umamiNotConfigured:
          "Umami is not configured (UMAMI_URL, UMAMI_USERNAME, UMAMI_PASSWORD, UMAMI_WEBSITE_ID).",
        periods: {
          today: "Today",
          d7: "7 days",
          d30: "30 days",
          d60: "60 days",
          d90: "90 days",
        },
        durationUnits: {
          secondsShort: "s",
          minutesShort: "m",
        },
      },
    },
    shops: {
      title: "Shops",
      newShop: "New shop",
      searchPlaceholder: "Search…",
      noShops: "No shops found.",
      noShopsHint: "Add your first shop using the + button.",
      noResultsPrefix: "No results for",
      noResultsHint: "Try a different search term.",
      filters: {
        all: "All",
        public: "Public",
        onhold: "On hold",
        deleted: "Deleted",
      },
      table: {
        shop: "Shop",
        categories: "Categories",
        region: "Region",
        statusOnhold: "on hold",
        statusDeleted: "deleted",
        edit: "Edit",
        putOnHold: "Put on hold",
        restore: "Restore",
        delete: "Delete",
        deletionInfo: "Deletion details",
        deletedBy: "Deleted by",
        deletedAt: "Deleted at",
        deletionReason: "Reason",
        noReason: "No reason provided",
        wasReported: "Shop was reported",
      },
      editCard: {
        titleSubmissionEdit: "Edit suggestion",
        titleNew: "New shop",
        titleEdit: "Edit shop",
        previewImage: "Preview image",
        noImage: "No image set",
        reloadImage: "Reload",
        upload: "Upload",
        unsplash: "Unsplash",
        deleteImage: "Delete",
        errorSaving: "Error while saving.",
      },
      deleteCard: {
        title: "Delete shop",
        markedDeletedHint: "is marked as deleted and is no longer publicly visible.",
        reason: "Reason",
        optional: "(optional)",
        markdownSupported: "Markdown supported",
        reasonPlaceholder: "Why is this shop being removed?",
        reportedLabel: "Shop was reported (dead link or shop report)",
        modeLabel: "Delete mode",
        markDeleted: "Mark as deleted",
        deletePermanently: "Delete",
        deleting: "Deleting…",
        deleteShop: "Delete shop",
      },
    },
    categories: {
      title: "Categories",
      newCategory: "New category",
      empty: "No categories available yet.",
      emptyHint: "Create your first category using the + button.",
      deleteTitle: "Delete category?",
      deleteDescriptionSuffix: "will be permanently deleted. Assigned shops lose this category.",
      table: {
        name: "Name",
        slug: "Slug",
        shops: "Shops",
        edit: "Edit",
        delete: "Delete",
      },
      card: {
        shopSingular: "Shop",
        shopPlural: "Shops",
        edit: "Edit",
        delete: "Delete",
      },
      editCard: {
        titleNew: "New category",
        titleEdit: "Edit category",
        name: "Name",
        slug: "Slug",
        description: "Description",
        upload: "Upload",
        unsplash: "Unsplash",
        deleteImage: "Delete",
        errorSaving: "Error while saving.",
      },
      unsplash: {
        searchError: "Search failed",
        searchPlaceholder: "Enter search term…",
        closeAria: "Close",
        searchHint: "Enter a search term to find images",
        emptyPrefix: "No images found for",
        addTitlePrefix: "Photo by",
      },
    },
    submissions: {
      title: "Reports",
      tabs: {
        suggestions: "Suggestions",
        deadLinks: "Dead links",
        shopReports: "Shop reports",
      },
      status: {
        pending: "Open",
        onhold: "On hold",
        approved: "Approved",
        rejected: "Rejected",
      },
      sort: {
        oldFirst: "Oldest first",
        newFirst: "Newest first",
      },
      suggestions: {
        nonePrefix: "No",
        noneHint: "New suggestions will appear here once submitted.",
        reject: "Reject",
        onhold: "Put on hold",
        edit: "Edit",
        approve: "Approve",
        delete: "Delete",
        confirmDeleteTitle: "Delete rejected suggestion?",
        confirmDeleteDescription: "will be permanently removed.",
        feedbackToPrefix: "Send email feedback to",
        reviewApproveTitle: "Approve suggestion",
        reviewRejectTitle: "Reject suggestion",
        comment: "Comment",
        optional: "(optional)",
        rejectReasonPlaceholder: "Reason for rejection…",
        commentPlaceholder: "Optional comment…",
        reviewErrorPrefix: "Error:",
        accept: "Approve",
        decline: "Reject",
        doneOrDecline: "Done / Reject",
      },
      deadLinks: {
        none: "No reported dead links.",
        noneHint: "All reported links are reachable.",
        reportedSuffix: "× reported",
        keep: "Keep",
        delete: "Delete",
        confirmDeleteTitle: "Delete shop permanently?",
        confirmDeleteDescription:
          "The shop is permanently removed and no longer visible on the frontend.",
      },
      shopReports: {
        loading: "Loading…",
        none: "No shop reports.",
        noneHint: "No new shop reports available.",
        doneOrDecline: "Done / Reject",
        edit: "Edit",
        delete: "Delete",
      },
    },
    users: {
      title: "Users",
      inviteUser: "+ Invite user",
      you: "You",
      role: {
        owner: "Owner",
        admin: "Admin",
        moderator: "Moderator",
      },
      editTitle: "Edit user",
      remove: "Remove",
      removeConfirmTitle: "Remove user?",
      removeConfirmDescription: "will lose admin access. This action cannot be undone.",
      createCard: {
        closeAria: "Close dialog",
        title: "Create new user",
        role: "Role",
        username: "Username",
        email: "Email",
        tempPassword: "Temporary password",
        minLengthHint: "At least 8 characters.",
        welcomeTemplate: "Welcome email",
        welcomeTemplateNone: "Don't send email",
        errorCreating: "Error while creating user.",
        creating: "Creating…",
        create: "Create user",
      },
      editCard: {
        title: "Edit user",
        uploadImage: "Upload image",
        useGravatar: "Use Gravatar",
        removeAvatar: "Remove",
        username: "Username",
        email: "Email",
        firstName: "First name",
        lastName: "Last name",
        role: "Role",
        password: "New password",
        passwordPlaceholder: "Do not change",
        roleAdmin: "Admin",
        roleModerator: "Moderator",
        errorSaving: "Error while saving.",
        editTooltip: "Edit",
      },
    },
    content: {
      editor: {
        decreaseFontSize: "Decrease font size",
        increaseFontSize: "Increase font size",
        deletePage: "Delete page",
        confirmDelete: "Delete permanently?",
        confirmDeleteAction: "Yes, delete",
        saved: "Saved",
        titleLabel: "Title",
        slugLabel: "Slug",
        statusLabel: "Status",
        ok: "OK",
        statusDraft: "Draft",
        statusPublished: "Published",
        statusHidden: "Hidden",
        createdBy: "Created by",
        updatedBy: "Updated by",
        loadingContent: "Loading content…",
        saveError: "Error while saving. Please try again.",
      },
      linkPicker: {
        insertInternalLink: "Insert internal link",
        closeSelection: "Close link picker",
        searchPlaceholder: "Search page or category…",
        noResults: "No results",
        groups: {
          static: "Static",
          pages: "Pages",
          categories: "Categories",
          forms: "Forms",
        },
        staticRoutes: {
          homeCategories: "Home / Categories",
          suggestShop: "Suggest shop",
          search: "Search",
        },
      },
      loadingFallback: "Loading content editor...",
      pages: {
        title: "Pages",
        newPage: "New page",
        createTitle: "Create new page",
        fieldTitle: "Title",
        fieldSlug: "Slug (URL path)",
        titlePlaceholder: "e.g. About us",
        slugPlaceholder: "about-us",
        create: "Create",
        creating: "Creating…",
        createError: "Error while creating",
        confirmDeletePrefix: 'Delete page "',
        confirmDeleteSuffix: '" for sure?',
        loadPages: "Loading pages…",
        emptyPages: "No pages available yet.",
        emptyPagesHint: "Create your first page using the + button.",
        deletePageTitle: "Delete page",
        table: {
          title: "Title",
          slug: "Slug",
          status: "Status",
          createdBy: "Created by",
          updatedBy: "Updated by",
        },
        status: {
          published: "Published",
          hidden: "Hidden",
          draft: "Draft",
        },
      },
    },
    formBuilder: {
      title: "Edit Form",
      listTitle: "Forms",
      newForm: "New Form",
      formNameLabel: "Name (internal, immutable)",
      formSlugLabel: "URL path (slug)",
      formSlugHint: "Used as the page address on the website (e.g. /my-form).",
      create: "Create",
      backToList: "← All forms",
      slugLabel: "URL path (slug)",
      slugPlaceholder: "e.g. my-form",
      save: "Save",
      saved: "Saved",
      saveError: "Error while saving. Please try again.",
      empty: "No fields yet. Drag fields from the palette.",
      editButton: "Edit",
      noForms: "No forms yet.",
      noFormsHint: "Create your first form using the + button.",
      slugConflict: "This URL path is already in use.",
      nameConflict: "A form with this name already exists.",
      noFieldSelected: "No field selected",
      noFieldSelectedHint: "Tap a field on the canvas to configure it.",
      deleteConfirmPrefix: 'Delete form "',
      deleteConfirmSuffix: '"?',
      deleteConfirmDescription: "This action cannot be undone.",
      tableColumns: {
        name: "Name",
        status: "Status",
      },
      status: {
        active: "Active",
        inactive: "Inactive",
        activate: "Activate",
        deactivate: "Deactivate",
      },
      paletteGroups: {
        standard: "Fields",
        special: "Special",
      },
      fieldTypes: {
        text: "Input",
        email: "Email",
        textarea: "Textarea",
        select: "Select",
        multiSelect: "Multi-select",
        categoriesSelect: "Categories",
        regionsSelect: "Regions",
        checkbox: "Checkbox",
        richtext: "Markdown Editor",
        button: "Button",
        password: "Input Password",
        headline: "Headline",
        separator: "Separator",
        paragraph: "Paragraph",
      },
      panel: {
        label: "Label",
        fieldName: "Variable name",
        rows: "Height (rows)",
        placeholder: "Placeholder",
        required: "Required",
        span: "Width",
        options: "Options",
        optionsHint: "One option per line",
        validationMin: "Min.",
        validationMax: "Max.",
        maxChars: "Max. characters",
        subtext: "Help text",
        content: "Content",
        variant: "Style",
        variantDefault: "Default",
        variantInfo: "Info",
        variantWarning: "Warning",
        variantHint: "Hint",
        buttonType: "Type",
        buttonTypeButton: "Button",
        buttonTypeSubmit: "Submit",
        buttonTypeReset: "Reset",
        buttonWidth: "Width",
        buttonWidthAutomatic: "Automatic",
        buttonWidthFull: "Full width",
        buttonAlign: "Alignment",
        buttonAlignLeft: "Left",
        buttonAlignCenter: "Center",
        buttonAlignRight: "Right",
        buttonIcon: "Icon",
        buttonIconNone: "No icon",
        buttonDisplay: "Display",
        buttonDisplayText: "Text",
        buttonDisplayIcon: "Icon",
        buttonDisplayBoth: "Both",
        headlineLevel: "Level",
        headlineLevelH1: "H1 – Title",
        headlineLevelH2: "H2 – Section",
        headlineLevelH3: "H3 – Subsection",
        buttonAction: "Action",
        buttonActionNone: "None",
        buttonActionOpenUrl: "Open URL",
        buttonActionCopyClipboard: "Copy",
        buttonActionClearField: "Clear field",
        buttonActionSourceField: "Source field",
        inputType: "Input type",
        inputTypeText: "Text",
        inputTypeEmail: "Email",
        inputTypePassword: "Password",
        inputTypeUrl: "URL",
        inputTypeTel: "Phone",
        inputTypeDate: "Date",
        inputTypeNumber: "Number",
        separatorNoSettings: "Separator has no further settings.",
        loadingEditor: "Loading editor…",
        validation: "Validation",
        spanAriaOf: "of",
        iconPickerVariantOutline: "Outline",
        iconPickerVariantFilled: "Filled",
        iconPickerSearch: "Search icons…",
        iconPickerEmpty: "No icons found",
      },
      submission: {
        title: "Submission",
        addStep: "Select step",
        addStepButton: "Add",
        stepStore: "Store",
        stepEmail: "Email notification",
        stepCreateShopSuggestion: "Create shop suggestion",
        stepMoveAria: "Move step",
        stepRemoveAria: "Remove step",
        emailTo: "Recipient",
        emailToStatic: "Static address",
        emailToFromField: "From field",
        emailSubject: "Subject (optional)",
        emailSubjectPlaceholder: "New form submission",
        emailTemplate: "Email template",
        emailTemplateNone: "No template (plain table)",
        successBehaviourLabel: "After submit",
        successMessage: "Success message",
        successHeadline: "Headline",
        successHeadlinePlaceholder: "Thank you!",
        successMessagePlaceholder: "Thank you for your message!",
        successRedirect: "Redirect",
        noSteps: "No steps configured.",
      },
      exportForm: "Export",
      exportAll: "Export all",
      importForm: "Import",
      importSuccess: "{n} form(s) imported successfully",
      importError: "Error while importing",
      importInvalidFile: "Invalid file",
      importConflictTitle: "Name conflict: {name}",
      importConflictHint: "A form with this name already exists.",
      importOverwrite: "Overwrite",
      importRename: "New name",
      importNewNameLabel: "New name",
      importSkip: "Skip",
      exportUnsavedWarning: "Please save before exporting.",
    },
    emailTemplates: {
      listTitle: "Email Templates",
      newTemplate: "New Template",
      editTemplate: "Edit Template",
      templateName: "Name",
      templateSubject: "Subject",
      subjectPlaceholder: "Welcome to lmaa.space",
      headerBanner: "Header image (URL)",
      headerText: "Header text",
      bodyText: "Body",
      footerBanner: "Footer image (URL)",
      footerText: "Footer text",
      deleteTemplate: "Delete template",
      deleteTemplateConfirm: "Really delete this template?",
      noTemplates: "No templates yet.",
      noTemplatesHint: "Create your first template using the + button.",
      backToList: "← All Templates",
      save: "Save",
      saved: "Saved",
      saveError: "Error saving. Please try again.",
      nameConflict: "A template with this name already exists.",
      systemBadge: "System",
      tableCreated: "Created",
      preview: "Preview",
      previewTitle: "Email Preview",
      sectionHeader: "Header",
      sectionBody: "Body",
      sectionFooter: "Footer",
      importTemplate: "Import Template",
      exportTemplate: "Export",
      exportAll: "Export All",
      importSuccess: "{n} template(s) imported successfully.",
      importError: "Import error.",
      importInvalidFile: "Invalid file.",
      importConflictTitle: "Conflict: {name}",
      importConflictHint: "A template with this name already exists.",
      importOverwrite: "Overwrite",
      importRename: "Rename",
      importSkip: "Skip",
      importNewNameLabel: "New name",
    },
    errors: {
      boundary: {
        title: "An error occurred",
        fallbackMessage: "An unexpected error occurred in the admin application",
        reload: "Reload dashboard",
        retry: "Try again",
      },
    },
  },
};
