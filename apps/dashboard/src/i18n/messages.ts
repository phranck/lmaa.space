import { MEDIA_UPLOAD_MAX_LABEL } from "@lmaa/shared";

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
    saved: string;
    sending: string;
    sendTestEmail: string;
    startCheck: string;
    stopCheck: string;
    retryCheck: string;
    edit: string;
    create: string;
    delete: string;
    remove: string;
    duplicate: string;
    copy: string;
    copyUrl: string;
    availableVariables: string;
    import: string;
    export: string;
    approve: string;
    reject: string;
    restore: string;
    putOnHold: string;
    overwrite: string;
    skip: string;
    close: string;
    loading: string;
    unknownError: string;
  };
  layout: {
    menuOpen: string;
    menuClose: string;
    resizeSidebar: string;
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
      landingPage: string;
      media: string;
      users: string;
      pages: string;
      pagesOverview: string;
      navigations: string;
      formBuilder: string;
      formsOverview: string;
      emailTemplates: string;
      emailTemplatesOverview: string;
      socialMediaPostTemplates: string;
      socialMediaPostTemplatesOverview: string;
      footerBuilder: string;
      supportPrompts: string;
      sponsors: string;
      sponsorRequests: string;
      sponsoringSettings: string;
      sectionSponsoring: string;
      systemSettings: string;
      redirectUrls: string;
      socialPreview: string;
      socialPreviewImages: string;
      socialPreviewOverview: string;
      socialMediaAccounts: string;
      backgroundErrors: string;
      expandAll: string;
      collapseAll: string;
      expandAllAria: string;
      collapseAllAria: string;
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
    invite: {
      title: string;
      subtitle: string;
      password: string;
      confirmPassword: string;
      passwordMismatch: string;
      invalidLink: string;
      submit: string;
      submitLoading: string;
      toLogin: string;
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
      backgroundErrors: string;
      backgroundErrorsUnresolved: string;
    };
  };
  shops: {
    title: string;
    searchPlaceholder: string;
    noShops: string;
    noShopsHint: string;
    noFilteredShopsPrefix: string;
    noFilteredShopsHint: string;
    noResultsPrefix: string;
    noResultsHint: string;
    filters: {
      all: string;
      public: string;
      onhold: string;
      deleted: string;
      rejected: string;
    };
    categoryFilter: {
      all: string;
    };
    table: {
      shop: string;
      categories: string;
      categoriesMore: string;
      region: string;
      statusOnhold: string;
      statusDeleted: string;
      statusRejected: string;
      rejectionInfo: string;
      edit: string;
      putOnHold: string;
      restore: string;
      delete: string;
      permanentDelete: string;
      permanentDeleteTitle: string;
      permanentDeleteDescription: string;
      deletionInfo: string;
      deletedBy: string;
      deletedAt: string;
      deletionReason: string;
      noReason: string;
      wasReported: string;
      needsReview: string;
      likes: string;
    };
    exportLabel: string;
    exportTooltip: string;
    importLabel: string;
    importTooltip: string;
    importError: string;
    importInvalidFile: string;
    editCard: {
      titleSubmissionEdit: string;
      titleNew: string;
      titleEdit: string;
      publishedAt: string;
      openDetailPage: string;
      previewImage: string;
      noImage: string;
      openImage: string;
      reloadImage: string;
      setImage: string;
      upload: string;
      unsplash: string;
      deleteImage: string;
      errorSaving: string;
      rejectTitle: string;
      rejectSubmit: string;
      acceptReview: string;
      logoBackground: {
        label: string;
        reset: string;
      };
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
      filterOrientation: string;
      orientationAll: string;
      orientationLandscape: string;
      orientationPortrait: string;
      orientationSquarish: string;
      filterOrderBy: string;
      orderByRelevant: string;
      orderByLatest: string;
      filterColor: string;
      colorAny: string;
      colorBlackAndWhite: string;
      colorBlack: string;
      colorWhite: string;
      colorYellow: string;
      colorOrange: string;
      colorRed: string;
      colorPurple: string;
      colorMagenta: string;
      colorGreen: string;
      colorTeal: string;
      colorBlue: string;
      selectedCount: string;
      addSelected: string;
    };
  };
  media: {
    title: string;
    upload: string;
    uploading: string;
    uploadHint: string;
    dropTitle: string;
    folderUploadFallbackName: string;
    readingFolder: string;
    hlsBundleFallbackName: string;
    readingHlsFolder: string;
    readingFilesProgress: string;
    uploadingHlsBundle: string;
    uploadingFile: string;
    uploadingFilesProgress: string;
    uploadProgress: string;
    uploadProgressUnknown: string;
    processingUpload: string;
    processingUploadHint: string;
    uploadNameConflictTitle: string;
    uploadNameConflictDescription: string;
    uploadNameConflictNameLabel: string;
    uploadNameConflictNameTaken: string;
    uploadNameConflictApplyToAll: string;
    uploadNameConflictRename: string;
    uploadNameConflictOverwrite: string;
    directoryUploadUnsupported: string;
    emptyFolderUpload: string;
    empty: string;
    emptyHint: string;
    selectPrompt: string;
    selectionTitle: string;
    selectedCount: string;
    selectedSize: string;
    detailsTitle: string;
    previewTitle: string;
    infoTitle: string;
    displayName: string;
    originalName: string;
    fileType: string;
    dimensions: string;
    fileSize: string;
    internalUrl: string;
    posterUrl: string;
    createdAt: string;
    updatedAt: string;
    uploadedBy: string;
    linkedContentTitle: string;
    linkedContentEmpty: string;
    linkedContentOwnerLabels: {
      project: string;
      post: string;
      page: string;
    };
    linkedContentRoleLabels: {
      hero: string;
      preview: string;
      document: string;
    };
    alias: string;
    aliasPlaceholder: string;
    aliasHintEmpty: string;
    aliasHintHls: (alias: string) => string;
    aliasHintImage: (alias: string) => string;
    aliasHintModel: string;
    saveName: string;
    openFile: string;
    copyUrl: string;
    copyMarkdownEmbed: string;
    markdownEmbed: string;
    copied: string;
    renameError: string;
    uploadError: string;
    loadError: string;
    uploadTooLarge: string;
    unsupportedPreview: string;
    tileSize: string;
    deleteTitle: string;
    deleteSelected: string;
    deleteSelectedTitle: string;
    deleteDescription: string;
    deleteSelectedDescription: string;
    contextMenu: {
      openInNewTab: string;
      openInNewWindow: string;
      saveToDownloads: string;
      saveAs: string;
      copyAddress: string;
      copyAsset: string;
      renameAlias: string;
      renameDisplayName: string;
      openFolder: string;
      renameFolderInline: string;
      folderColorLabel: string;
      folderColorNames: {
        red: string;
        orange: string;
        yellow: string;
        green: string;
        blue: string;
        purple: string;
        gray: string;
      };
      deleteFolder: string;
      deleteFolderWithCount: (count: number) => string;
      deleteAsset: string;
      deleteSelection: string;
      newFolder: string;
      newFolderWithSelection: (count: number) => string;
      addAssets: string;
    };
    folders: {
      newFolderTitle: string;
      newFolderWithSelectionTitle: (count: number) => string;
      renameFolderTitle: string;
      deleteFolderTitle: string;
      deleteFolderConfirm: (count: number) => string;
      folderNameLabel: string;
      folderNamePlaceholder: string;
      folderNameTaken: string;
      itemsCount: (count: number) => string;
      emptyFolder: string;
      breadcrumbRoot: string;
      notFound: string;
    };
    table: {
      name: string;
      type: string;
      size: string;
      updated: string;
    };
  };
  landingPage: {
    title: string;
    tabHeroBanner: string;
    heroBanner: {
      addImages: string;
      imagePool: string;
      imagePoolEmpty: string;
      imagePoolHint: string;
      selectedBadge: string;
      markSelected: string;
      markDeselected: string;
      markActive: string;
      removeImage: string;
      removeConfirmTitle: string;
      removeConfirmDescription: string;
      photographerCredit: string;
      noImagesSelected: string;
      rotationLabel: string;
      rotationOn: string;
      rotationOff: string;
      rotationInterval: string;
      rotationIntervalSuffix: string;
      rotationIntervalSave: string;
      focalPointDrag: string;
    };
  };
  submissions: {
    title: string;
    tabs: {
      suggestions: string;
      deadLinks: string;
      shopReports: string;
      automatedChecks: string;
    };
    automatedChecks: {
      columnShop: string;
      columnState: string;
      columnVerdict: string;
      columnModel: string;
      columnCost: string;
      columnFinished: string;
      costIncomplete: string;
      totalLabel: string;
      todayLabel: string;
      emptyTitle: string;
      emptyHint: string;
    };
    review: {
      title: string;
      none: string;
      noneHint: string;
      stateLabel: string;
      verdictLabel: string;
      modelLabel: string;
      costLabel: string;
      attemptLabel: string;
      onholdLabel: string;
      proposalPrefilled: string;
      acceptPrefilled: string;
      timelineLabel: string;
      reportLabel: string;
      checkedAtLabel: string;
      resendReport: string;
      states: {
        queued: string;
        running: string;
        provider_waiting: string;
        applying: string;
        completed: string;
        failed: string;
        cancelled: string;
      };
      verdicts: {
        accept: string;
        reject: string;
        onhold: string;
      };
      progress: {
        title: string;
        elapsedLabel: string;
        queuedHint: string;
        runningHint: string;
        doneHint: string;
        show: string;
      };
      events: {
        "provider.started": string;
        "provider.submitted": string;
        "result.validated": string;
        "result.repaired": string;
        "result.repair_failed": string;
        "result.invalid": string;
        "attempt.failed": string;
        "result.enriched": string;
        "result.flagged": string;
        "result.applied": string;
        "result.conflict": string;
        "result.none": string;
        "job.cancelled": string;
        "job.failed": string;
        "report.sent": string;
        "report.failed": string;
      };
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
      categoriesMore: string;
      rejectedAt: string;
      submittedAt: string;
      submittedBy: string;
      reject: string;
      onhold: string;
      edit: string;
      approve: string;
      delete: string;
      confirmDeleteTitle: string;
      confirmDeleteDescription: string;
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
      restore: string;
      info: string;
      infoTitle: string;
      editRejectionInfo: string;
      reviewEditRejectionTitle: string;
      noReason: string;
      setToOpen: string;
      rejectionLongLabel: string;
      rejectionLongPlaceholder: string;
      exportLabel: string;
      exportTooltip: string;
      importLabel: string;
      importTooltip: string;
      importError: string;
      importInvalidFile: string;
      reviewBadge: string;
      notificationLabel: string;
      notificationApproved: string;
      notificationRejected: string;
      notificationNone: string;
      notificationHint: string;
      mastodonNotificationLabel: string;
      mastodonNotificationNone: string;
      mastodonNotificationHint: string;
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
      done: string;
      reject: string;
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
      inviteFlowHint: string;
      welcomeTemplate: string;
      welcomeTemplateNone: string;
      inviteCreated: string;
      inviteHint: string;
      inviteLink: string;
      copyInvite: string;
      inviteCopied: string;
      templateVariablesLabel: string;
      templateVariableUsername: string;
      templateVariableEmail: string;
      templateVariableRole: string;
      templateVariableInviteUrl: string;
      templateVariableLoginUrl: string;
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
      language: string;
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
      contentWidthLabel: string;
      contentWidthDefault: string;
      contentWidthWide: string;
      contentWidthFull: string;
      ok: string;
      statusDraft: string;
      statusPublished: string;
      statusHidden: string;
      showTitleLabel: string;
      createdBy: string;
      updatedBy: string;
      loadingContent: string;
      saveError: string;
      preview: string;
      shortcuts: {
        save: string;
        bold: string;
        italic: string;
        strikethrough: string;
        link: string;
      };
    };
    footerBuilder: {
      title: string;
      saveError: string;
      styleTitle: string;
      paletteTitle: string;
      columnsTitle: string;
      addColumn: string;
      noSettings: string;
      headlineTextLabel: string;
      contentLabel: string;
      buttonLabelField: string;
      buttonLabelPlaceholder: string;
      urlLabel: string;
      urlPlaceholder: string;
      styleLabel: string;
      externalLink: string;
      directionLabel: string;
      alignLabel: string;
      iconSizeLabel: string;
      iconsLabel: string;
      iconsEmpty: string;
      spacerHint: string;
      styleOptions: {
        filled: string;
        outline: string;
        ghost: string;
      };
      directionOptions: {
        vertical: string;
        horizontal: string;
      };
      alignOptions: {
        left: string;
        center: string;
        right: string;
      };
      iconSizeOptions: {
        sm: string;
        md: string;
        lg: string;
      };
      colorFields: {
        background: string;
        text: string;
        headlines: string;
        links: string;
        linkHover: string;
        button: string;
        buttonText: string;
      };
      sizeOptions: {
        small: string;
        medium: string;
        large: string;
        extraLarge: string;
      };
      heightLabel: string;
      verticalPaddingLabel: string;
      previewTitle: string;
      reloadPreview: string;
      noPreviewLoaded: string;
      moveColumn: string;
      removeColumn: string;
      dragBlockHere: string;
      removeBlock: string;
      columnSpan: {
        narrow: string;
        normal: string;
        wide: string;
      };
      blockLabels: {
        headline: string;
        markdown: string;
        button: string;
        footerNav: string;
        separator: string;
        spacer: string;
        socialMedia: string;
      };
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
      confirmDeleteDescription: string;
      loadPages: string;
      emptyPages: string;
      emptyPagesHint: string;
      deletePageTitle: string;
      table: {
        title: string;
        slug: string;
        status: string;
        createdBy: string;
        updatedAt: string;
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
    canvasTitle: string;
    preferencesTitle: string;
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
      buttonActionCheckShop: string;
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
      allowMarkdown: string;
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
    moveRow: string;
    removeField: string;
    textTokensHelp: {
      open: string;
      title: string;
      description: string;
      notations: {
        title: string;
        unicodeTitle: string;
        unicodeBody: string;
        namedTitle: string;
        namedBody: string;
        entityTitle: string;
        entityBody: string;
        edgeCaseNote: string;
      };
      tableTitle: string;
      cols: {
        token: string;
        symbol: string;
        codepoint: string;
        description: string;
      };
      tokens: {
        nbhy: string;
        nbsp: string;
        wj: string;
        shy: string;
        ndash: string;
        mdash: string;
        zwj: string;
        zwnj: string;
      };
      exampleTitle: string;
      exampleInputLabel: string;
      exampleOutputLabel: string;
      exampleNote: string;
      close: string;
    };
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
    sendTestSuccess: string;
    sendTestError: string;
    systemBadge: string;
    systemHint: string;
    systemCheckbox: string;
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
  socialMediaTemplates: {
    listTitle: string;
    newTemplate: string;
    templateName: string;
    bodyText: string;
    deleteTemplate: string;
    deleteTemplateConfirm: string;
    noTemplates: string;
    noTemplatesHint: string;
    backToList: string;
    save: string;
    saved: string;
    saveError: string;
    nameConflict: string;
    tableCreated: string;
    previewTitle: string;
    emptyPreview: string;
    variablesTitle: string;
    variablesHint: string;
    copyVariable: string;
    copiedVariable: string;
    variables: Record<string, string>;
    systemBadge: string;
    systemHint: string;
    systemCheckbox: string;
    platformsLabel: string;
    platformMastodon: string;
    platformBluesky: string;
    bodyMastodonLabel: string;
    bodyBlueskyLabel: string;
    scopesLabel: string;
    scopes: {
      submission: string;
      category: string;
      helpText: string;
      validationMin: string;
    };
  };
  socialMedia: {
    title: string;
    editAccount: string;
    noAccounts: string;
    noAccountsHint: string;
    tokenStored: string;
    tokenMissing: string;
    tokenRequired: string;
    saveError: string;
    tokenInvalid: string;
    instanceUnreachable: string;
    deleteAccount: string;
    deleteConfirm: string;
    accessTokenPlaceholder: string;
    keepTokenPlaceholder: string;
    addAccountTitle: string;
    mastodonMaxPostCharactersLabel: string;
    profileUrlLabel: string;
    profileUrlRequired: string;
    labelRequired: string;
    platformPickerLabel: string;
    openLink: string;
    showInFooter: string;
    useForPosting: string;
    postingPlatformOnly: string;
    conflictForPlatform: string;
    fields: {
      label: string;
      instanceUrl: string;
      username: string;
      accessToken: string;
      accessTokenOptional: string;
      visibility: string;
      active: string;
    };
    badges: {
      yes: string;
      no: string;
    };
    visibility: Record<"public" | "unlisted" | "private" | "direct", string>;
    columns: {
      platform: string;
      account: string;
      identifier: string;
      profileUrl: string;
      posting: string;
      footer: string;
      token: string;
      status: string;
    };
    bluesky: {
      sectionTitle: string;
      addAccount: string;
      empty: string;
      labelLabel: string;
      handleLabel: string;
      appPasswordLabel: string;
      appPasswordKeepHint: string;
      appPasswordRecommendation: string;
      appPasswordSettingsLink: string;
      activeLabel: string;
      conflictError: string;
      invalidCredentialsError: string;
      serviceUnreachableError: string;
    };
    approve: {
      postTo: string;
      noPost: string;
      staleChoice: string;
      postOverflowWarning: string;
      approveBlockedHint: string;
    };
  };
  system: {
    sponsors: {
      title: string;
      newSponsor: string;
      emptyTitle: string;
      emptyHint: string;
      nameLabel: string;
      firstNameLabel: string;
      lastNameLabel: string;
      socialMediaLabel: string;
      socialMediaHint: string;
      imageLabel: string;
      imageHint: string;
      refreshPicture: string;
      removePicture: string;
      noPictureFound: string;
      claimLabel: string;
      claimHint: string;
      publishedLabel: string;
      publishedHint: string;
      hiddenBadge: string;
      amountLabel: string;
      amountHint: string;
      paidAtLabel: string;
      paidAtHint: string;
      remainingLabel: string;
      daysLeft: string;
      expired: string;
      personTitle: string;
      contributionTitle: string;
      costsTitle: string;
      payeeTitle: string;
      payeeHint: string;
      payeeNameLabel: string;
      payeeIbanLabel: string;
      payeeBicLabel: string;
      payeeBicHint: string;
      variableLabel: string;
      costsVariables: string;
      costsHint: string;
      costLabelLabel: string;
      costAmountLabel: string;
      addCost: string;
      minAmountTitle: string;
      minAmountLabel: string;
      minAmountHint: string;
      deleteTitle: string;
      deleteMessage: string;
    };
    pendingSponsorships: {
      title: string;
      emptyTitle: string;
      emptyHint: string;
      referenceLabel: string;
      announcedLabel: string;
      takeOver: string;
      takeOverTitle: string;
      takeOverHint: string;
      deleteTitle: string;
      deleteMessage: string;
    };
    supportPrompts: {
      title: string;
      subtitle: string;
      listTitle: string;
      listHint: string;
      empty: string;
      newPrompt: string;
      namePlaceholder: string;
      nameLabel: string;
      slotLabel: string;
      slots: { myShops: string; shopDetail: string; categoryGrid: string };
      contentLabel: string;
      contentHint: string;
      buttonLabel: string;
      buttonHrefLabel: string;
      buttonAlignmentLabel: string;
      buttonAlignments: { leading: string; center: string; trailing: string };
      thresholdLabel: string;
      thresholdHint: string;
      thresholdBasisLabel: string;
      thresholdBases: { viewed: string; liked: string };
      startsAtLabel: string;
      endsAtLabel: string;
      windowHint: string;
      priorityLabel: string;
      priorityHint: string;
      publishedLabel: string;
      publishedHint: string;
      limitsTitle: string;
      limitsHint: string;
      maxShownLabel: string;
      maxShownHint: string;
      snoozeDaysLabel: string;
      snoozeDaysHint: string;
      dismissSnoozeDaysLabel: string;
      dismissSnoozeDaysHint: string;
      dismissalsUntilResolvedLabel: string;
      dismissalsUntilResolvedHint: string;
      devAlwaysShowLabel: string;
      devAlwaysShowHint: string;
      placementTitle: string;
      placementHint: string;
      scheduleTitle: string;
      windowColumn: string;
      stateColumn: string;
      emptyTitle: string;
      emptyHint: string;
      deleteTitle: string;
      deleteMessage: string;
      states: { draft: string; scheduled: string; live: string; expired: string };
    };
    settings: {
      title: string;
      notificationsTab: string;
      domainAlertsTab: string;
      reviewTab: string;
      review: {
        title: string;
        subtitle: string;
        keyMissing: string;
        modeLabel: string;
        modeOff: string;
        modeAssist: string;
        modeHintOff: string;
        modeHintAssist: string;
        autoApplyTitle: string;
        autoApplyHint: string;
        autoApplyAccept: string;
        autoApplyReject: string;
        notifyHint: string;
        notifyAcceptTemplateLabel: string;
        notifyRejectTemplateLabel: string;
        autoApplyBlocked: string;
        modelLabel: string;
        modelHint: string;
        modelLoading: string;
        effortLabel: string;
        effortHint: string;
        effortUnsupported: string;
        maxAttemptsLabel: string;
        maxAttemptsHint: string;
        costTitle: string;
        costPerCheckLabel: string;
        costPerCheckHint: string;
        costPerDayLabel: string;
        costPerDayHint: string;
        costHint: string;
        reportTitle: string;
        reportTemplateLabel: string;
        reportHint: string;
        reportRequireTemplate: string;
        saveError: string;
      };
      newShopSubmission: {
        title: string;
        recipientLabel: string;
        recipientNotConfigured: string;
        templateLabel: string;
        templatePlaceholder: string;
        templateLoading: string;
        hint: string;
        requireTemplateHint: string;
      };
      domainAlerts: {
        title: string;
        hint: string;
        newRule: string;
        emptyTitle: string;
        emptyHint: string;
        active: string;
        inactive: string;
        defaultName: string;
        nameLabel: string;
        domainsLabel: string;
        domainsHint: string;
        messageLabel: string;
        messageHint: string;
        enabledLabel: string;
        deleteRule: string;
        editRule: string;
        noSelection: string;
        validationError: string;
        nameRequired: string;
        domainsRequired: string;
        messageRequired: string;
        domainCountLabel: string;
        moveUp: string;
        moveDown: string;
        loadingEditor: string;
        createRule: string;
        saveRule: string;
        saveError: string;
        dialogCreateTitle: string;
        dialogEditTitle: string;
        tableColumnName: string;
        tableColumnDomains: string;
        tableColumnStatus: string;
        tableColumnActions: string;
      };
    };
    redirectUrls: {
      title: string;
      hint: string;
      newRedirect: string;
      emptyTitle: string;
      emptyHint: string;
      active: string;
      inactive: string;
      defaultName: string;
      nameLabel: string;
      nameHint: string;
      targetUrlLabel: string;
      targetUrlHint: string;
      publicUrlLabel: string;
      openInNewWindowLabel: string;
      openInNewWindowDescription: string;
      enabledLabel: string;
      deleteRedirect: string;
      editRedirect: string;
      copyPublicUrl: string;
      validationError: string;
      nameRequired: string;
      nameDuplicate: string;
      targetUrlInvalid: string;
      createRedirect: string;
      saveRedirect: string;
      saveError: string;
      dialogCreateTitle: string;
      dialogEditTitle: string;
      tableColumnName: string;
      tableColumnPublicUrl: string;
      tableColumnTargetUrl: string;
      tableColumnWindow: string;
      tableColumnStatus: string;
      tableColumnActions: string;
      sameWindow: string;
      newWindow: string;
    };
    socialPreview: {
      title: string;
      editorTitle: string;
      livePreviewTitle: string;
      chooseBackground: string;
      addText: string;
      addImage: string;
      imageSourceUnsplash: string;
      imageSourceAssets: string;
      imageSourceComputer: string;
      assetPickerTitle: string;
      assetPickerEmpty: string;
      assetPickerEmptyHint: string;
      addShape: string;
      newProject: string;
      newProjectTitle: string;
      renameAction: string;
      renameProjectTitle: string;
      renameImageTitle: string;
      projectNameLabel: string;
      imageNameLabel: string;
      projectNamePlaceholder: string;
      noProjectLoaded: string;
      saveProject: string;
      loadProject: string;
      updatedAtLabel: string;
      savedProjectsTitle: string;
      imagesNavLabel: string;
      emptyProjectsTitle: string;
      emptyProjectsHint: string;
      projectLayer: string;
      keyboardHint: string;
      layersTitle: string;
      layersEmpty: string;
      resizeLayerSidebar: string;
      hideLayer: string;
      showLayer: string;
      lockLayer: string;
      unlockLayer: string;
      savedTitle: string;
      emptyTitle: string;
      emptyHint: string;
      activeBadge: string;
      defaultBadge: string;
      setActive: string;
      unsetActive: string;
      setDefault: string;
      copyShareUrl: string;
      shareUrlCopied: string;
      shareUrlUnavailable: string;
      openImage: string;
      deleteImage: string;
      imageGridSizeLabel: string;
      outputTitle: string;
      nameLabel: string;
      previewNameLabel: string;
      formatLabel: string;
      qualityLabel: string;
      targetSizeLabel: string;
      targetSizeHint: string;
      targetSizePngHint: string;
      previewMeta: string;
      estimatedSizeLabel: string;
      selectionTitle: string;
      backgroundColor: string;
      backgroundZoom: string;
      backgroundOffsetX: string;
      backgroundOffsetY: string;
      noSelection: string;
      textLayer: string;
      imageLayer: string;
      baseImageLayer: string;
      imageTintColor: string;
      imageTintOpacity: string;
      imageBrightness: string;
      imageContrast: string;
      shapeLayer: string;
      deleteLayer: string;
      shapeKind: string;
      shapeRectangle: string;
      shapeCircle: string;
      shapeEllipse: string;
      shapePolygon: string;
      shapeStar: string;
      cornerRadius: string;
      radius: string;
      sides: string;
      points: string;
      border: string;
      borderColor: string;
      borderThickness: string;
      borderOpacity: string;
      width: string;
      height: string;
      rotation: string;
      opacity: string;
      textContent: string;
      fontFamily: string;
      textColor: string;
      fontSize: string;
      fontWeight: string;
      fontStyle: string;
      fontUnderline: string;
      align: string;
      alignLeft: string;
      alignCenter: string;
      alignRight: string;
      lineHeight: string;
      letterSpacing: string;
      saveAndActivate: string;
      deleteProjectConfirmTitle: string;
      deleteProjectConfirmDescription: string;
      deleteConfirmTitle: string;
      deleteConfirmDescription: string;
    };
    backgroundErrors: {
      title: string;
      columnSource: string;
      columnMessage: string;
      columnOccurredAt: string;
      columnStatus: string;
      resolveAction: string;
      deleteAction: string;
      deleteConfirmTitle: string;
      deleteConfirmDescription: string;
      statusOpen: string;
      statusResolved: string;
      noErrors: string;
      noErrorsSubtitle: string;
      filterSourcePlaceholder: string;
      filterAll: string;
      filterUnresolved: string;
      filterResolved: string;
    };
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
      saved: "Gespeichert",
      sending: "Wird gesendet…",
      sendTestEmail: "Test Email senden",
      startCheck: "Prüfung starten",
      stopCheck: "Prüfung abbrechen",
      retryCheck: "Erneut prüfen",
      edit: "Bearbeiten",
      create: "Erstellen",
      delete: "Löschen",
      remove: "Entfernen",
      duplicate: "Duplizieren",
      copy: "Kopieren",
      copyUrl: "URL kopieren",
      availableVariables: "Verfügbare Variablen",
      import: "Importieren",
      export: "Exportieren",
      approve: "Freischalten",
      reject: "Ablehnen",
      restore: "Wiederherstellen",
      putOnHold: "Zurückstellen",
      overwrite: "Überschreiben",
      skip: "Überspringen",
      close: "Schließen",
      loading: "Lade…",
      unknownError: "Unbekannter Fehler",
    },
    layout: {
      menuOpen: "Menü öffnen",
      menuClose: "Menü schließen",
      resizeSidebar: "Seitenleiste anpassen",
      pageFallbackTitle: "lmaa.space",
      sidebar: {
        sectionGeneral: "Allgemein",
        sectionContent: "Content",
        sectionTemplates: "Builders",
        sectionSystem: "System",
        overview: "Übersicht",
        submissions: "Meldungen",
        shops: "Shops",
        categories: "Kategorien",
        landingPage: "Startseite",
        media: "Media",
        users: "Benutzer",
        pages: "Seiten",
        pagesOverview: "Übersicht",
        navigations: "Navigationen",
        formBuilder: "Formular-Builder",
        formsOverview: "Übersicht",
        emailTemplates: "E-Mail Templates",
        emailTemplatesOverview: "Übersicht",
        socialMediaPostTemplates: "Social Media Templates",
        socialMediaPostTemplatesOverview: "Übersicht",
        footerBuilder: "Footer-Builder",
        supportPrompts: "Einblendungen",
        sponsors: "Jahressponsoren",
        sponsorRequests: "Sponsor Requests",
        sponsoringSettings: "Einstellungen",
        sectionSponsoring: "Sponsoring",
        systemSettings: "Einstellungen",
        redirectUrls: "Redirect URLs",
        socialPreview: "Social Media Preview",
        socialPreviewImages: "Images",
        socialPreviewOverview: "Übersicht",
        socialMediaAccounts: "Social Media Accounts",
        backgroundErrors: "Hintergrundfehler",
        expandAll: "Alles aufklappen",
        collapseAll: "Alles zuklappen",
        expandAllAria: "Alle Gruppen aufklappen",
        collapseAllAria: "Alle Gruppen zuklappen",
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
      invite: {
        title: "Einladung annehmen",
        subtitle: "Lege dein Passwort für den Dashboard-Zugang fest.",
        password: "Passwort",
        confirmPassword: "Passwort bestätigen",
        passwordMismatch: "Passwörter stimmen nicht überein.",
        invalidLink: "Der Einladungslink ist ungültig oder abgelaufen.",
        submit: "Passwort setzen",
        submitLoading: "Speichern...",
        toLogin: "Zum Login",
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
        backgroundErrors: "Hintergrundfehler",
        backgroundErrorsUnresolved: "Ungelöst",
      },
    },
    shops: {
      title: "Shops",
      searchPlaceholder: "Suchen…",
      noShops: "Keine Shops gefunden.",
      noShopsHint: "Füge deinen ersten Shop über den +-Button hinzu.",
      noFilteredShopsPrefix: "Keine Shops für",
      noFilteredShopsHint: "Wähle einen anderen Statusfilter.",
      noResultsPrefix: "Keine Treffer für",
      noResultsHint: "Versuche einen anderen Suchbegriff.",
      filters: {
        all: "Alle",
        public: "Öffentlich",
        onhold: "Zurückgestellt",
        deleted: "Gelöscht markiert",
        rejected: "Abgelehnt",
      },
      categoryFilter: {
        all: "Alle Kategorien",
      },
      table: {
        shop: "Shop",
        categories: "Kategorien",
        categoriesMore: "+{n} weitere",
        region: "Region",
        statusOnhold: "zurückgestellt",
        statusDeleted: "gelöscht",
        statusRejected: "abgelehnt",
        rejectionInfo: "Ablehnungs-Info",
        edit: "Bearbeiten",
        putOnHold: "Zurückstellen",
        restore: "Wiederherstellen",
        delete: "Löschen",
        permanentDelete: "Löschen",
        permanentDeleteTitle: "Shop dauerhaft löschen?",
        permanentDeleteDescription:
          "Der Shop wird dauerhaft aus der Datenbank entfernt. Diese Aktion kann nicht rückgängig gemacht werden.",
        deletionInfo: "Löschdetails",
        deletedBy: "Gelöscht von",
        deletedAt: "Gelöscht am",
        deletionReason: "Begründung",
        noReason: "Kein Grund angegeben",
        wasReported: "Shop wurde gemeldet",
        needsReview: "Review",
        likes: "Likes",
      },
      exportLabel: "Exportieren",
      exportTooltip: "Shops als JSON exportieren",
      importLabel: "Importieren",
      importTooltip: "Review-Ergebnisse importieren",
      importError: "Fehler beim Import",
      importInvalidFile: "Ungültige Datei",
      editCard: {
        titleSubmissionEdit: "Vorschlag bearbeiten",
        titleNew: "Neuer Shop",
        titleEdit: "Shop bearbeiten",
        publishedAt: "freigeschaltet am",
        openDetailPage: "Detailseite öffnen",
        previewImage: "Vorschaubild",
        noImage: "Kein Bild gesetzt",
        openImage: "Bild in neuem Tab öffnen",
        reloadImage: "Neu laden",
        setImage: "Übernehmen",
        upload: "Hochladen",
        unsplash: "Unsplash",
        deleteImage: "Löschen",
        errorSaving: "Fehler beim Speichern.",
        rejectTitle: "Shop ablehnen",
        rejectSubmit: "Ablehnen",
        acceptReview: "Review akzeptieren",
        logoBackground: {
          label: "Logo-Hintergrundfarbe",
          reset: "Zurücksetzen",
        },
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
        filterOrientation: "Ausrichtung",
        orientationAll: "Alle",
        orientationLandscape: "Querformat",
        orientationPortrait: "Hochformat",
        orientationSquarish: "Quadratisch",
        filterOrderBy: "Sortierung",
        orderByRelevant: "Relevanz",
        orderByLatest: "Neueste",
        filterColor: "Farbe",
        colorAny: "Alle Farben",
        colorBlackAndWhite: "Schwarz-Weiß",
        colorBlack: "Schwarz",
        colorWhite: "Weiß",
        colorYellow: "Gelb",
        colorOrange: "Orange",
        colorRed: "Rot",
        colorPurple: "Lila",
        colorMagenta: "Magenta",
        colorGreen: "Grün",
        colorTeal: "Türkis",
        colorBlue: "Blau",
        selectedCount: "ausgewählt",
        addSelected: "Hinzufügen",
      },
    },
    landingPage: {
      title: "Startseite",
      tabHeroBanner: "Hero Banner",
      heroBanner: {
        addImages: "Bilder hinzufügen",
        imagePool: "Bildersammlung",
        imagePoolEmpty: "Noch keine Bilder gesammelt.",
        imagePoolHint:
          "Füge Bilder aus Unsplash hinzu. Markierte Bilder werden auf der Startseite rotiert.",
        selectedBadge: "Aktiv",
        markSelected: "Für Rotation aktivieren",
        markDeselected: "Aus Rotation entfernen",
        markActive: "Als aktives Bild setzen",
        removeImage: "Entfernen",
        removeConfirmTitle: "Bild entfernen?",
        removeConfirmDescription: "Das Bild wird aus der Sammlung gelöscht.",
        photographerCredit: "Foto von",
        noImagesSelected:
          "Kein Bild als aktiv markiert – auf der Startseite wird das Standard-Bild angezeigt.",
        rotationLabel: "Rotation",
        rotationOn: "Ein",
        rotationOff: "Aus",
        rotationInterval: "Bild wechseln nach",
        rotationIntervalSuffix: "Seitenaufrufen",
        rotationIntervalSave: "Speichern",
        focalPointDrag: "Bildausschnitt anpassen",
      },
    },
    media: {
      title: "Media",
      upload: "Dateien hochladen",
      uploading: "Lade hoch…",
      uploadHint: `Erlaubt: Bilder, MP4-Video, HLS-Ordner mit optionalem Poster, PDF, TXT, MD, CSV, DOC(X), XLS(X), PPT(X). Einzelfiles bis ${MEDIA_UPLOAD_MAX_LABEL}; HLS-Bundles werden bei Bedarf in Chunks hochgeladen.`,
      dropTitle: "Loslassen zum Hochladen",
      folderUploadFallbackName: "Ordner",
      readingFolder: "Ordner wird gelesen…",
      hlsBundleFallbackName: "HLS-Ordner",
      readingHlsFolder: "HLS-Ordner wird gelesen…",
      readingFilesProgress: "{read}/{total} Dateien gelesen",
      uploadingHlsBundle: "HLS-Bundle wird hochgeladen…",
      uploadingFile: "Datei wird hochgeladen…",
      uploadingFilesProgress: "{uploaded}/{total} Dateien",
      uploadProgress: "{percent}% hochgeladen",
      uploadProgressUnknown: "Upload läuft…",
      processingUpload: "Upload wird verarbeitet…",
      processingUploadHint: "Der Server validiert und speichert die Dateien.",
      uploadNameConflictTitle: "Name bereits vorhanden",
      uploadNameConflictDescription:
        "Es gibt bereits ein Media-Asset mit dem Namen {name}. Wähle einen neuen Namen oder überschreibe das vorhandene Asset.",
      uploadNameConflictNameLabel: "Neuer Name",
      uploadNameConflictNameTaken: "Dieser Name ist bereits vergeben.",
      uploadNameConflictApplyToAll: "Für alle Konflikte dieser Aktion anwenden",
      uploadNameConflictRename: "Umbenennen",
      uploadNameConflictOverwrite: "Überschreiben",
      directoryUploadUnsupported:
        "Der Ordner konnte nicht gelesen werden. Zieh den HLS-Ordner direkt aus Finder oder Explorer in den Media-Bereich.",
      emptyFolderUpload: "{name} enthält keine lesbaren Dateien.",
      empty: "Noch keine Dateien vorhanden.",
      emptyHint:
        "Lade Bilder, Videos oder Dokumente hoch, damit sie in Pages und anderen Inhalten nutzbar sind.",
      selectPrompt: "Wähle links eine Datei aus, um Metadaten und die interne URL zu sehen.",
      selectionTitle: "Auswahl",
      selectedCount: "Ausgewählte Dateien",
      selectedSize: "Gesamtgröße",
      detailsTitle: "Metadaten",
      previewTitle: "Vorschau",
      infoTitle: "Datei-Infos",
      displayName: "Anzeigename",
      originalName: "Originalname",
      fileType: "Dateityp",
      dimensions: "Abmessungen",
      fileSize: "Dateigröße",
      internalUrl: "Interne URL",
      posterUrl: "Poster-URL",
      createdAt: "Hochgeladen",
      updatedAt: "Geändert",
      uploadedBy: "Hochgeladen von",
      linkedContentTitle: "Verwendet in",
      linkedContentEmpty: "Keine Verknüpfungen gefunden.",
      linkedContentOwnerLabels: {
        project: "Projekt",
        post: "Post",
        page: "Seite",
      },
      linkedContentRoleLabels: {
        hero: "Hero",
        preview: "Preview",
        document: "Dokument",
      },
      alias: "Alias",
      aliasPlaceholder: "z.B. sepa-qr",
      aliasHintEmpty: "Optional. Erlaubt: a-z, 0-9, Bindestrich.",
      aliasHintHls: (alias: string) => `Verwendung: [[hls:${alias}]]`,
      aliasHintImage: (alias: string) => `Verwendung: [[image:${alias}]] oder [[pdf:${alias}]]`,
      aliasHintModel: "Verwendung als Modell-Asset.",
      saveName: "Name speichern",
      openFile: "Öffnen",
      copyUrl: "URL kopieren",
      copyMarkdownEmbed: "Markdown-Embed kopieren",
      markdownEmbed: "Markdown-Embed",
      copied: "Kopiert",
      renameError: "Name konnte nicht gespeichert werden.",
      uploadError: "Datei konnte nicht hochgeladen werden.",
      loadError: "Media konnte nicht geladen werden.",
      uploadTooLarge: "{name} ist zu groß. Maximal erlaubt sind {max}.",
      unsupportedPreview: "Für diesen Dateityp ist keine Vorschau verfügbar.",
      tileSize: "Kachelgröße",
      deleteTitle: "Datei löschen?",
      deleteSelected: "Auswahl löschen",
      deleteSelectedTitle: "Auswahl löschen?",
      deleteDescription:
        "wird dauerhaft gelöscht und ist unter der internen URL nicht mehr erreichbar. Bei Bundles wird der gesamte Inhalt entfernt.",
      deleteSelectedDescription:
        "{count} Dateien werden dauerhaft gelöscht und sind unter ihren internen URLs nicht mehr erreichbar. Bundles werden mit dem gesamten Inhalt entfernt.",
      contextMenu: {
        openInNewTab: "In neuem Tab öffnen",
        openInNewWindow: "In neuem Fenster öffnen",
        saveToDownloads: "In Downloads sichern",
        saveAs: "Sichern unter…",
        copyAddress: "Adresse kopieren",
        copyAsset: "Asset kopieren",
        renameAlias: "Alias umbenennen",
        renameDisplayName: "Anzeigename umbenennen",
        openFolder: "Ordner öffnen",
        renameFolderInline: "Ordner umbenennen",
        folderColorLabel: "Ordnerfarbe",
        folderColorNames: {
          red: "Rot",
          orange: "Orange",
          yellow: "Gelb",
          green: "Grün",
          blue: "Blau",
          purple: "Lila",
          gray: "Grau",
        },
        deleteFolder: "Ordner löschen",
        deleteFolderWithCount: (count: number) => `Ordner löschen (${count})`,
        deleteAsset: "Asset löschen",
        deleteSelection: "Auswahl löschen",
        newFolder: "Neuer Ordner",
        newFolderWithSelection: (count: number) => `Neuer Ordner mit Auswahl (${count})`,
        addAssets: "Assets hinzufügen",
      },
      folders: {
        newFolderTitle: "Neuer Ordner",
        newFolderWithSelectionTitle: (count: number) => `Neuer Ordner mit ${count} Assets`,
        renameFolderTitle: "Ordner umbenennen",
        deleteFolderTitle: "Ordner löschen?",
        deleteFolderConfirm: (count: number) =>
          count > 0
            ? `${count} enthaltene Elemente werden dauerhaft gelöscht.`
            : "Dieser Ordner wird dauerhaft gelöscht.",
        folderNameLabel: "Ordnername",
        folderNamePlaceholder: "Name eingeben…",
        folderNameTaken: "Ein Ordner mit diesem Namen existiert bereits.",
        itemsCount: (count: number) => `${count} Elemente`,
        emptyFolder: "Dieser Ordner ist leer.",
        breadcrumbRoot: "Media",
        notFound: "Der Ordner wurde nicht gefunden.",
      },
      table: {
        name: "Name",
        type: "Typ",
        size: "Größe",
        updated: "Geändert",
      },
    },
    submissions: {
      title: "Meldungen",
      tabs: {
        suggestions: "Vorschläge",
        deadLinks: "Defekte Links",
        shopReports: "Shop-Meldungen",
        automatedChecks: "Automatische Prüfungen",
      },
      automatedChecks: {
        columnShop: "Shop",
        columnState: "Zustand",
        columnVerdict: "Ergebnis",
        columnModel: "Modell",
        columnCost: "Kosten",
        columnFinished: "Abgeschlossen",
        costIncomplete:
          "Für einen Versuch dieser Prüfung fehlte eine abrechenbare Größe. Der Betrag ist deshalb eine Untergrenze, tatsächlich abgerechnet wurde mindestens so viel.",
        totalLabel: "Gesamt",
        todayLabel: "Heute",
        emptyTitle: "Noch keine automatische Prüfung",
        emptyHint: "Sobald die Automatik läuft, erscheint hier jede Prüfung mit ihren Kosten.",
      },
      review: {
        title: "Automatische Prüfung",
        none: "Für diesen Vorschlag läuft keine automatische Prüfung.",
        noneHint: "Du kannst eine anstoßen, sobald der Modus nicht mehr auf Aus steht.",
        stateLabel: "Zustand",
        verdictLabel: "Ergebnis",
        modelLabel: "Geprüft mit",
        costLabel: "Kosten",
        attemptLabel: "Versuch",
        onholdLabel: "Grund für die Zurückstellung",
        proposalPrefilled:
          "Die automatische Prüfung empfiehlt eine Ablehnung. Kommentar und Langbegründung stehen im Ablehnen-Dialog bereits in den Feldern, das Token ist eingesetzt.",
        acceptPrefilled:
          "Die automatische Prüfung empfiehlt die Aufnahme. Alle recherchierten Angaben stehen bereits in den Feldern dieser Seite.",
        timelineLabel: "Verlauf",
        reportLabel: "Bericht",
        checkedAtLabel: "Geprüft am",
        resendReport: "Erneut senden",
        states: {
          queued: "Wartet",
          running: "Läuft",
          provider_waiting: "Beim Provider",
          applying: "Wird angewendet",
          completed: "Abgeschlossen",
          failed: "Fehlgeschlagen",
          cancelled: "Abgebrochen",
        },
        verdicts: {
          accept: "Aufnahme empfohlen",
          reject: "Ablehnung empfohlen",
          onhold: "Zurückgestellt",
        },
        progress: {
          title: "Automatische Prüfung",
          elapsedLabel: "Laufzeit",
          queuedHint:
            "Der Auftrag steht in der Warteschlange. Der Worker holt ihn sich innerhalb von 30 Sekunden.",
          runningHint:
            "Die Recherche läuft beim Anbieter. Je nach Modell und Denktiefe dauert das einige Minuten. Du kannst das Fenster schließen, die Prüfung läuft weiter.",
          doneHint: "Die Prüfung ist beendet.",
          show: "Fortschritt",
        },
        events: {
          "provider.started": "Recherche beim Anbieter gestartet",
          "provider.submitted": "Beim Anbieter eingereicht, wird verarbeitet",
          "result.validated": "Ergebnis geprüft und angenommen",
          "result.repaired": "Formfehler im Text korrigiert",
          "result.repair_failed": "Textkorrektur hat nicht geholfen",
          "result.invalid": "Ergebnis unbrauchbar, neuer Versuch",
          "attempt.failed": "Versuch fehlgeschlagen",
          "result.enriched": "Angaben in den Vorschlag geschrieben",
          "result.flagged": "Vorschlag auf bereit zur Prüfung gesetzt",
          "result.applied": "Entscheidung angewendet",
          "result.conflict": "Konflikt mit einem bestehenden Shop",
          "result.none": "Keine Änderung am Vorschlag",
          "job.cancelled": "Abgebrochen",
          "job.failed": "Fehlgeschlagen",
          "report.sent": "Bericht versendet",
          "report.failed": "Bericht konnte nicht versendet werden",
        },
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
        categoriesMore: "+{n} weitere",
        rejectedAt: "Abgelehnt am",
        submittedAt: "eingereicht am",
        submittedBy: "eingereicht von",
        reject: "Ablehnen",
        onhold: "Zurückstellen",
        edit: "Bearbeiten",
        approve: "Freischalten",
        delete: "Löschen",
        confirmDeleteTitle: "Vorschlag löschen?",
        confirmDeleteDescription: "wird dauerhaft entfernt.",
        reviewApproveTitle: "Vorschlag freischalten",
        reviewRejectTitle: "Vorschlag ablehnen",
        comment: "Kommentar",
        optional: "(optional)",
        rejectReasonPlaceholder: "Grund für Ablehnung…",
        commentPlaceholder: "Optionaler Kommentar…",
        reviewErrorPrefix: "Fehler:",
        accept: "Freischalten",
        decline: "Ablehnen",
        doneOrDecline: "Erledigt / Ablehnen",
        restore: "Wiederherstellen",
        info: "Ablehnungs-Info",
        infoTitle: "Ablehnungsgrund",
        editRejectionInfo: "Ablehnung bearbeiten",
        reviewEditRejectionTitle: "Ablehnungs-Info bearbeiten",
        noReason: "Kein Ablehnungsgrund hinterlegt.",
        setToOpen: "Auf Neu setzen",
        rejectionLongLabel: "Langbegründung (öffentliche Seite)",
        rejectionLongPlaceholder: "Ausführliche Begründung für die Ablehnungsseite…",
        exportLabel: "Exportieren",
        exportTooltip: "Submissions als JSON exportieren",
        importLabel: "Importieren",
        importTooltip: "Review-Ergebnisse importieren",
        importError: "Fehler beim Import",
        importInvalidFile: "Ungültige Datei",
        reviewBadge: "Review",
        notificationLabel: "E-Mail-Benachrichtigung",
        notificationApproved: "Template bei Freischaltung",
        notificationRejected: "Template bei Ablehnung",
        notificationNone: "Keine E-Mail senden",
        notificationHint: "Nur wenn eine Einreicher-E-Mail vorhanden ist.",
        mastodonNotificationLabel: "Mastodon-Post",
        mastodonNotificationNone: "Keinen Mastodon-Post senden",
        mastodonNotificationHint:
          "Wird beim Freischalten mit den aktiven Mastodon-Accounts aus den Social-Media-Einstellungen gesendet.",
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
        done: "Behalten",
        reject: "Ablehnen",
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
        inviteFlowHint:
          "Neue Benutzer erhalten einen Einladungslink und setzen ihr Passwort selbst.",
        welcomeTemplate: "Willkommens-E-Mail",
        welcomeTemplateNone: "Keine E-Mail senden",
        inviteCreated: "Einladung erstellt",
        inviteHint:
          "Diesen Link kannst du direkt teilen, falls keine Welcome-Mail verschickt wird.",
        inviteLink: "Einladungslink",
        copyInvite: "Link kopieren",
        inviteCopied: "Link kopiert",
        templateVariablesLabel: "Template-Variablen",
        templateVariableUsername: "Benutzername des eingeladenen Benutzers",
        templateVariableEmail: "E-Mail-Adresse des eingeladenen Benutzers",
        templateVariableRole: "Rolle des angelegten Benutzers",
        templateVariableInviteUrl: "Einmal-Link zum Passwort-Setzen",
        templateVariableLoginUrl: "Normale Dashboard-Login-Seite",
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
        language: "Sprache",
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
        contentWidthLabel: "Breite",
        contentWidthDefault: "Standard",
        contentWidthWide: "Breit",
        contentWidthFull: "Maximal",
        ok: "OK",
        statusDraft: "Entwurf",
        statusPublished: "Veröffentlicht",
        statusHidden: "Versteckt",
        showTitleLabel: "Titel anzeigen",
        createdBy: "Erstellt von",
        updatedBy: "Geändert von",
        loadingContent: "Lade Inhalt…",
        saveError: "Fehler beim Speichern. Bitte erneut versuchen.",
        preview: "Vorschau",
        shortcuts: {
          save: "Speichern",
          bold: "Fett",
          italic: "Kursiv",
          strikethrough: "Durchgestrichen",
          link: "Link",
        },
      },
      footerBuilder: {
        title: "Footer-Builder",
        saveError: "Fehler beim Speichern",
        styleTitle: "Stil",
        paletteTitle: "Blöcke",
        columnsTitle: "Spalten",
        addColumn: "Spalte",
        noSettings: "Keine weiteren Einstellungen.",
        headlineTextLabel: "Text",
        contentLabel: "Inhalt",
        buttonLabelField: "Label",
        buttonLabelPlaceholder: "Button-Text",
        urlLabel: "URL",
        urlPlaceholder: "https://… oder /pfad",
        styleLabel: "Stil",
        externalLink: "Externer Link (neuer Tab)",
        directionLabel: "Ausrichtung",
        alignLabel: "Ausrichtung",
        iconSizeLabel: "Icon-Größe",
        iconsLabel: "Icons (Reihenfolge per Drag)",
        iconsEmpty:
          'Keine Footer-fähigen Accounts. Lege unter Social Media einen an und aktiviere „Im Footer anzeigen".',
        spacerHint: "Schiebt nachfolgende Blöcke in der Spalte ans Ende — wie ein SwiftUI-Spacer.",
        styleOptions: {
          filled: "Gefüllt",
          outline: "Outline",
          ghost: "Ghost",
        },
        directionOptions: {
          vertical: "Vertikal",
          horizontal: "Horizontal",
        },
        alignOptions: {
          left: "Links",
          center: "Zentriert",
          right: "Rechts",
        },
        iconSizeOptions: {
          sm: "Klein",
          md: "Mittel",
          lg: "Groß",
        },
        colorFields: {
          background: "Hintergrund",
          text: "Text",
          headlines: "Überschriften",
          links: "Links",
          linkHover: "Link Hover",
          button: "Button-Farbe",
          buttonText: "Button-Text",
        },
        sizeOptions: {
          small: "Klein",
          medium: "Normal",
          large: "Groß",
          extraLarge: "Sehr groß",
        },
        heightLabel: "Footer-Höhe",
        verticalPaddingLabel: "Vertikales Padding",
        previewTitle: "Footer Vorschau",
        reloadPreview: "Neu laden",
        noPreviewLoaded: "Noch keine Vorschau geladen.",
        moveColumn: "Spalte verschieben",
        removeColumn: "Spalte entfernen",
        dragBlockHere: "Block hierher ziehen",
        removeBlock: "Block entfernen",
        columnSpan: {
          narrow: "Schmal",
          normal: "Normal",
          wide: "Breit",
        },
        blockLabels: {
          headline: "Überschrift",
          markdown: "Markdown",
          button: "Button",
          footerNav: "Footer-Nav",
          separator: "Trennlinie",
          spacer: "Spacer",
          socialMedia: "Social Media",
        },
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
        confirmDeleteDescription: "Soll die folgende Seite wirklich gelöscht werden?",
        loadPages: "Lade Seiten…",
        emptyPages: "Noch keine Seiten vorhanden.",
        emptyPagesHint: "Erstelle deine erste Seite über den +-Button.",
        deletePageTitle: "Seite löschen",
        table: {
          title: "Titel",
          slug: "Slug",
          status: "Status",
          createdBy: "Erstellt von",
          updatedAt: "Geändert am",
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
      canvasTitle: "Formular-Canvas",
      preferencesTitle: "Einstellungen",
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
        regionsSelect: "Versand-Regionen",
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
        buttonActionCheckShop: "Shop prüfen",
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
        allowMarkdown: "Markdown erlaubt",
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
      moveRow: "Zeile verschieben",
      removeField: "Feld entfernen",
      textTokensHelp: {
        open: "Formatierungs-Hilfe",
        title: "Formatierungs-Tokens",
        description:
          "In Bezeichnung, Platzhalter, Hilfstext, Inhalt und Optionen können typografische Sonderzeichen über Tokens eingegeben werden. Sie werden beim Rendern automatisch durch das jeweilige Unicode-Zeichen ersetzt.",
        notations: {
          title: "Drei Notationen",
          unicodeTitle: "Unicode-Notation",
          unicodeBody:
            "U+XXXX (4–6 Hex-Ziffern). Beispiel: U+2011 wird zum geschützten Bindestrich ‑.",
          namedTitle: "Benannte Tokens",
          namedBody:
            "{name} mit einem der unten gelisteten Namen. Beispiel: {nbhy} wird zum geschützten Bindestrich ‑.",
          entityTitle: "HTML-Entities",
          entityBody:
            "&#NNN; (dezimal) oder &#xHH; (hexadezimal). Beispiel: &#8209; oder &#x2011; werden zum geschützten Bindestrich ‑.",
          edgeCaseNote:
            "Hinweis: U+XXXX funktioniert nur, wenn nach den Hex-Ziffern ein Nicht-Hex-Zeichen folgt (z.B. Leerzeichen, Punkt, Komma). Folgt direkt ein Buchstabe a–f, wird der Token nicht ersetzt — in dem Fall {nbhy} oder &#8209; verwenden.",
        },
        tableTitle: "Verfügbare benannte Tokens",
        cols: {
          token: "Token",
          symbol: "Symbol",
          codepoint: "Codepoint",
          description: "Beschreibung",
        },
        tokens: {
          nbhy: "Geschützter Bindestrich (kein Zeilenumbruch davor/danach)",
          nbsp: "Geschütztes Leerzeichen",
          wj: "Word Joiner (unsichtbar, verhindert Zeilenumbruch)",
          shy: "Bedingter Trennstrich (nur bei Umbruch sichtbar)",
          ndash: "Halbgeviertstrich (en dash)",
          mdash: "Geviertstrich (em dash)",
          zwj: "Zero-Width Joiner",
          zwnj: "Zero-Width Non-Joiner",
        },
        exampleTitle: "Beispiel",
        exampleInputLabel: "Eingabe",
        exampleOutputLabel: "Ergebnis",
        exampleNote:
          "Der Bindestrich klebt am folgenden Wort und wird nicht alleine an ein Zeilenende umbrochen.",
        close: "Schließen",
      },
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
      sendTestSuccess: "Test-Mail gesendet an",
      sendTestError: "Test-Mail konnte nicht gesendet werden. Bitte erneut versuchen.",
      systemBadge: "System",
      systemHint: "System-Templates können nicht gelöscht werden.",
      systemCheckbox: "System-Template",
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
    socialMediaTemplates: {
      listTitle: "Social Media Templates",
      newTemplate: "Neues Template",
      templateName: "Name",
      bodyText: "Post-Inhalt",
      deleteTemplate: "Template löschen",
      deleteTemplateConfirm: "Dieses Template wirklich löschen?",
      noTemplates: "Noch keine Social Media Templates vorhanden.",
      noTemplatesHint: "Erstelle dein erstes Template über den +-Button.",
      backToList: "← Alle Templates",
      save: "Speichern",
      saved: "Gespeichert",
      saveError: "Fehler beim Speichern. Bitte erneut versuchen.",
      nameConflict: "Ein Template mit diesem Namen existiert bereits.",
      tableCreated: "Erstellt",
      previewTitle: "Post-Vorschau",
      emptyPreview: "Die Vorschau erscheint, sobald Inhalt vorhanden ist.",
      variablesTitle: "Globale Variablen",
      variablesHint: "Diese Platzhalter kannst du im Template verwenden.",
      copyVariable: "Variable kopieren",
      copiedVariable: "Variable kopiert",
      variables: {
        shopName: "Name des freigeschalteten Shops",
        shopUrl: "Originale Shop-URL",
        shopDescription: "Beschreibung aus dem Shop-Vorschlag",
        shopRegion: "Regionen als kommagetrennte Liste",
        shopShipping: "Versandhinweis",
        shopPickup: "Abholhinweis",
        shopContactEmail: "Kontakt-E-Mail des Shops",
        shopCategories: "Kategorien des Shops",
        shopPageUrl: "Öffentliche Detailseite auf lmaa.space",
        adminNote: "Kommentar aus dem Freigabe-Dialog",
        categoryName: "Name der Kategorie",
        categorySlug: "URL-Slug der Kategorie",
        categoryDescription: "Beschreibung der Kategorie",
        categoryUrl: "Öffentliche Kategorieseite auf lmaa.space",
        categoryImageUrl: "Bild-URL der Kategorie",
        frontendUrl: "Öffentliche Frontend-URL",
        dashboardUrl: "Dashboard-URL",
      },
      systemBadge: "System",
      systemHint: "System-Templates können nicht gelöscht werden.",
      systemCheckbox: "System-Template",
      platformsLabel: "Verfügbar auf:",
      platformMastodon: "Mastodon",
      platformBluesky: "Bluesky",
      bodyMastodonLabel: "Mastodon-Beitrag",
      bodyBlueskyLabel: "Bluesky-Beitrag",
      scopesLabel: "Bereiche",
      scopes: {
        submission: "Shop Vorschlag",
        category: "Kategorie",
        helpText: "In welchen Dialogen darf dieses Template ausgewählt werden?",
        validationMin: "Mindestens ein Bereich erforderlich.",
      },
    },
    socialMedia: {
      title: "Social Media Accounts",
      editAccount: "Account bearbeiten",
      noAccounts: "Keine Accounts konfiguriert.",
      noAccountsHint:
        "Hinterlege einen Social Media Account für Footer-Links oder automatische Postings.",
      tokenStored: "Token hinterlegt",
      tokenMissing: "Kein Token",
      tokenRequired: "Bitte einen Access Token hinterlegen.",
      saveError: "Fehler beim Speichern.",
      tokenInvalid: "Der Access Token wurde von der Mastodon-Instanz abgelehnt.",
      instanceUnreachable:
        "Die Mastodon-Instanz ist nicht erreichbar. Bitte die Instanz-URL prüfen.",
      deleteAccount: "Account löschen?",
      deleteConfirm: "Diesen Account wirklich löschen?",
      accessTokenPlaceholder: "Mastodon User Access Token",
      keepTokenPlaceholder: "Leer lassen, um den aktuellen Token zu behalten",
      addAccountTitle: "Account hinzufügen",
      mastodonMaxPostCharactersLabel: "Max. Zeichen pro Post",
      profileUrlLabel: "Profil-URL",
      profileUrlRequired: "Bitte eine Profil-URL angeben.",
      labelRequired: "Bitte ein Label angeben.",
      platformPickerLabel: "Plattform wählen",
      openLink: "Link öffnen",
      showInFooter: "Im Footer anzeigen",
      useForPosting: "Für Posting verwenden",
      postingPlatformOnly: "Posting ist nur für Mastodon und Bluesky verfügbar.",
      conflictForPlatform: "Es existiert bereits ein Posting-Account für {platform}.",
      fields: {
        label: "Label",
        instanceUrl: "Instanz-URL",
        username: "Benutzername",
        accessToken: "Access Token",
        accessTokenOptional: "Access Token (optional)",
        visibility: "Sichtbarkeit",
        active: "Aktiv",
      },
      badges: {
        yes: "Ja",
        no: "Nein",
      },
      visibility: {
        public: "Public",
        unlisted: "Unlisted",
        private: "Private",
        direct: "Direct",
      },
      columns: {
        platform: "Plattform",
        account: "Account",
        identifier: "Kennung",
        profileUrl: "Profil-URL",
        posting: "Posting",
        footer: "Footer",
        token: "Token",
        status: "Status",
      },
      bluesky: {
        sectionTitle: "BlueSky Account",
        addAccount: "BlueSky Account hinzufügen",
        empty: "Noch kein BlueSky Account konfiguriert.",
        labelLabel: "Anzeigename",
        handleLabel: "Handle oder Email",
        appPasswordLabel: "Passwort",
        appPasswordKeepHint: "leer lassen, um das aktuelle Passwort zu behalten",
        appPasswordRecommendation: "App-Passwort empfohlen — sicherer und 2FA-kompatibel.",
        appPasswordSettingsLink: "App-Passwort in BlueSky erstellen",
        activeLabel: "Aktiv",
        conflictError: "Ein BlueSky Account ist bereits konfiguriert.",
        invalidCredentialsError: "BlueSky hat die Zugangsdaten abgelehnt.",
        serviceUnreachableError: "BlueSky ist nicht erreichbar.",
      },
      approve: {
        postTo: "Posten an",
        noPost: "Kein Post",
        staleChoice: "Vorauswahl gehört zu einem nicht mehr verfügbaren Template",
        postOverflowWarning:
          "Mit den echten Submission-Daten überschreitet der Post das Plattform-Limit.",
        approveBlockedHint: "Mindestens ein Post überschreitet das Zeichen-Limit.",
      },
    },
    system: {
      sponsors: {
        title: "Jahressponsoren",
        newSponsor: "Neuer Sponsor",
        emptyTitle: "Noch keine Sponsoren",
        emptyHint: "Wer die laufenden Kosten mitträgt, steht ein Jahr lang auf der Unterstützen-Seite.",
        nameLabel: "Name",
        firstNameLabel: "Vorname",
        lastNameLabel: "Nachname",
        socialMediaLabel: "Im Netz",
        socialMediaHint:
          "Adresse einfügen. Das Bild dahinter wird geholt, sobald die Adresse steht.",
        imageLabel: "Bild",
        imageHint: "Adresse eines Bildes. Leer heisst: kein Bild.",
        refreshPicture: "Bild neu holen",
        removePicture: "Bild entfernen",
        noPictureFound: "Hinter dieser Adresse liegt kein Bild.",
        claimLabel: "Sein Satz",
        claimHint: "Warum er oder sie das macht. Freiwillig.",
        publishedLabel: "Auf der Seite nennen",
        publishedHint:
          "Aus heisst: der Beitrag zählt für das Jahr, der Name steht aber nicht auf der Seite.",
        hiddenBadge: "Nicht genannt",
        amountLabel: "Betrag",
        amountHint: "In Euro. Steht nie neben einem Namen auf der Seite.",
        paidAtLabel: "Bezahlt am",
        paidAtHint: "Ab diesem Tag läuft das Jahr, nicht ab Januar.",
        remainingLabel: "Läuft noch",
        daysLeft: "Tage",
        expired: "Abgelaufen",
        personTitle: "Person",
        contributionTitle: "Beitrag",
        costsTitle: "Laufende Kosten",
        payeeTitle: "Empfänger",
        payeeHint: "Wohin die Überweisungen gehen. Steht auf der Zahlungskarte und im GiroCode.",
        payeeNameLabel: "Kontoinhaber",
        payeeIbanLabel: "IBAN",
        payeeBicLabel: "BIC",
        payeeBicHint: "Innerhalb des EWR nicht nötig.",
        variableLabel: "Als Variable:",
        costsVariables: "Als Variablen im Text: {annualCost} und {monthlyCost}",
        costsHint: "Summe im Jahr",
        costLabelLabel: "Posten",
        costAmountLabel: "€ pro Jahr",
        addCost: "Posten hinzufügen",
        minAmountTitle: "Mindestbetrag",
        minAmountLabel: "Mindestbetrag (€)",
        minAmountHint: "Das ist der Mindestbetrag, den ein Sponsor zahlen muss.",
        deleteTitle: "Sponsor löschen",
        deleteMessage: "Der Eintrag verschwindet sofort von der Seite.",
      },
      pendingSponsorships: {
        title: "Sponsor Requests",
        emptyTitle: "Niemand wartet",
        emptyHint: "Hier stehen die Angaben von allen, die auf der Seite Sponsor werden wollen.",
        referenceLabel: "Referenz",
        announcedLabel: "Angemeldet",
        takeOver: "Als Sponsor übernehmen",
        takeOverTitle: "Als Sponsor übernehmen",
        takeOverHint:
          "Betrag und Tag stehen im Kontoauszug, nicht in der Anmeldung. Alles andere kommt aus dem Eintrag.",
        deleteTitle: "Anmeldung löschen",
        deleteMessage: "Die Angaben sind danach weg, auch wenn das Geld noch kommt.",
      },
      supportPrompts: {
        title: "Einblendungen",
        subtitle:
          "Kurze Bitten, die im Verlauf der Seite stehen. Inhalt in Markdown, Ort und Regeln je Einblendung.",
        listTitle: "Einblendungen",
        listHint: "Je Platz und Seitenaufruf erscheint höchstens eine.",
        empty: "Noch keine Einblendung angelegt.",
        newPrompt: "Neue Einblendung",
        namePlaceholder: "Interner Name",
        nameLabel: "Name",
        slotLabel: "Platz",
        slots: {
          myShops: "Meine Shops",
          shopDetail: "Shop-Detailseite",
          categoryGrid: "Kategorien-Raster",
        },
        contentLabel: "Inhalt",
        contentHint: "{shops} und {views} werden durch die Zahlen des Lesers ersetzt.",
        buttonLabel: "Beschriftung des Buttons",
        buttonHrefLabel: "Ziel des Buttons",
        buttonAlignmentLabel: "Position des Buttons",
        buttonAlignments: { leading: "Links", center: "Mittig", trailing: "Rechts" },
        thresholdLabel: "Ab wie vielen Shops",
        thresholdHint: "0 heisst: gleich beim ersten Besuch.",
        thresholdBasisLabel: "Gezählt werden",
        thresholdBases: { viewed: "Besuchte Shops", liked: "Gemerkte Shops" },
        startsAtLabel: "Von",
        endsAtLabel: "Bis",
        windowHint: "Leer heisst: ohne Zeitgrenze.",
        priorityLabel: "Vorrang",
        priorityHint: "Höher gewinnt, wenn zwei für denselben Platz in Frage kommen.",
        publishedLabel: "Veröffentlicht",
        publishedHint: "Unveröffentlichte werden gar nicht erst ausgeliefert.",
        limitsTitle: "Grenzen für alle zusammen",
        limitsHint:
          "Gilt über alle Einblendungen hinweg und lässt sich von keiner einzelnen überschreiben.",
        maxShownLabel: "Höchstens sichtbar (Anzahl)",
        maxShownHint:
          "Wie oft ein Leser überhaupt eine Einblendung sieht, über alle zusammen gezählt. Ist die Zahl erreicht, sieht er nie wieder eine. Über 75 Prozent der Spenden kommen bei der ersten oder zweiten Einblendung, ab der zehnten praktisch keine mehr.",
        snoozeDaysLabel: "Ruhezeit (Tage)",
        snoozeDaysHint:
          "Wie lange nach einer Einblendung Ruhe ist. Gilt für alle Einblendungen zusammen, nicht nur für die gezeigte. 0 heisst: bei jedem Seitenaufruf wieder.",
        dismissSnoozeDaysLabel: "Ruhezeit nach Wegklicken (Tage)",
        dismissSnoozeDaysHint:
          "Wie lange Ruhe ist, wenn jemand eine Einblendung wegklickt. Länger als die normale Ruhezeit, weil Wegklicken eine Antwort ist und kein Übersehen. Gilt ebenfalls für alle Einblendungen zusammen.",
        dismissalsUntilResolvedLabel: "Wegklicken bis endgültig",
        dismissalsUntilResolvedHint:
          "Wie oft jemand dieselbe Einblendung wegklicken darf, bevor sie nicht mehr kommt. Einmal heisst „nicht jetzt“, so oft heisst „nein“. Betrifft nur diese eine Einblendung, die anderen erscheinen weiter.",
        devAlwaysShowLabel: "Immer anzeigen (nur Entwicklung)",
        devAlwaysShowHint:
          "Setzt alle Grenzen aus, damit eine Einblendung bei jedem Seitenaufruf erscheint. In der Produktion wirkt der Schalter nicht, auch wenn er hier an steht.",
        placementTitle: "Platzierung",
        placementHint: "Wo sie steht und ab wann sie erscheint. Der Ort bestimmt die Form.",
        scheduleTitle: "Zeitplan",
        windowColumn: "Zeitfenster",
        stateColumn: "Zustand",
        emptyTitle: "Noch keine Einblendung",
        emptyHint: "Lege eine an, um im Verlauf der Seite um Unterstützung zu bitten.",
        deleteTitle: "Einblendung löschen",
        deleteMessage:
          "Sie verschwindet sofort von der Seite. Was Leser bisher weggeklickt haben, wird dabei vergessen.",
        states: {
          draft: "Entwurf",
          scheduled: "Geplant",
          live: "Sichtbar",
          expired: "Abgelaufen",
        },
      },
      settings: {
        title: "Einstellungen",
        notificationsTab: "Benachrichtigungen",
        domainAlertsTab: "Domain-Alerts",
        reviewTab: "Automatische Prüfung",
        review: {
          title: "Automatische Prüfung von Shop-Vorschlägen",
          subtitle:
            "Änderungen wirken beim nächsten Durchlauf des Workers, spätestens nach 30 Sekunden.",
          keyMissing:
            "ANTHROPIC_API_KEY ist nicht gesetzt. Der Worker bleibt stehen, bis der Schlüssel in der Umgebung liegt.",
          modeLabel: "Modus",
          modeOff: "Aus",
          modeAssist: "Unterstützend",
          modeHintOff:
            "Es wird nichts geprüft und nichts abgerechnet. Eingehende Vorschläge reihen sich trotzdem ein, sodass beim Einschalten der Rückstand abgearbeitet wird.",
          modeHintAssist:
            "Das Rechercheergebnis wird in den Vorschlag geschrieben und er wird auf bereit zur Prüfung gesetzt. Bei einer empfohlenen Ablehnung stehen Kommentar und Langbegründung im Ablehnen-Dialog bereit. Die Entscheidung triffst weiterhin du, sofern du unten nichts anderes freigibst.",
          autoApplyTitle: "Ohne Rückfrage anwenden",
          autoApplyHint:
            "Wirkt nur im Modus Unterstützend. Ohne diese Schalter entscheidest weiterhin du, die Automatik bereitet nur vor.",
          autoApplyAccept: "Aufnahmen automatisch freigeben",
          autoApplyReject: "Ablehnungen automatisch veröffentlichen",
          notifyHint:
            "Wird ein Template gewählt, schreibt die Automatik nach ihrer Entscheidung an die Person, die den Shop vorgeschlagen hat. Ohne Template wird nichts versendet.",
          notifyAcceptTemplateLabel: "E-Mail bei automatischer Aufnahme",
          notifyRejectTemplateLabel: "E-Mail bei automatischer Ablehnung",
          autoApplyBlocked: "Nur im Modus Unterstützend verfügbar.",
          modelLabel: "Modell",
          modelHint:
            "Auswahl aus den Modellen, die der Anbieter derzeit anbietet. Das gewählte Modell wird bei jeder Prüfung mitgeschrieben, damit ein Ergebnis seinem Modell zuzuordnen bleibt, und es bestimmt den Preis je Million Token.",
          modelLoading: "Modelle werden geladen…",
          effortLabel: "Denktiefe",
          effortHint: "Höhere Stufen recherchieren gründlicher und kosten mehr.",
          effortUnsupported: "Dieses Modell kennt keine Denktiefe.",
          maxAttemptsLabel: "Versuche je Vorschlag",
          maxAttemptsHint: "Danach endet die Prüfung als zurückgestellt.",
          costTitle: "Kostenbremse",
          costPerCheckLabel: "Je Prüfung (EUR)",
          costPerCheckHint:
            "Erreicht ein einzelner Lauf diesen Betrag, wird er abgebrochen und der Vorschlag zurückgestellt.",
          costPerDayLabel: "Je Tag (EUR)",
          costPerDayHint:
            "Summe aller an einem Tag abgeschlossenen Prüfungen. Ist sie erreicht, nimmt der Worker bis zum nächsten Tag keine neuen Vorschläge mehr an.",
          costHint:
            "Der Deckel je Prüfung bricht den laufenden Versuch ab. Ist der Tagesdeckel erreicht, nimmt der Worker keine neuen Vorschläge mehr an.",
          reportTitle: "Bericht nach jeder Prüfung",
          reportTemplateLabel: "E-Mail-Template",
          reportHint: "Geht an OWNER_EMAIL, sobald eine Prüfung abgeschlossen ist.",
          reportRequireTemplate: "Bitte zuerst ein Template wählen, um den Bericht zu aktivieren.",
          saveError: "Die Einstellungen konnten nicht gespeichert werden.",
        },
        newShopSubmission: {
          title: "Neuer Shop-Vorschlag",
          recipientLabel: "Empfänger",
          recipientNotConfigured: "OWNER_EMAIL ist nicht konfiguriert.",
          templateLabel: "E-Mail-Template",
          templatePlaceholder: "Template wählen…",
          templateLoading: "Lade Templates…",
          hint: "Wird verschickt, sobald ein neuer Shop-Vorschlag eingeht.",
          requireTemplateHint:
            "Bitte zuerst ein Template wählen, um die Benachrichtigung zu aktivieren.",
        },
        domainAlerts: {
          title: "Submission Domain-Alerts",
          hint: "Aktive Regeln werden vor der normalen Duplikatprüfung der Reihe nach gegen die eingereichte Shop-Domain geprüft.",
          newRule: "Neuer Domain-Alert",
          emptyTitle: "Noch keine Regeln.",
          emptyHint: "Lege die erste Domainliste mit zugehöriger Markdown-Meldung an.",
          active: "aktiv",
          inactive: "aus",
          defaultName: "Neue Domain-Regel",
          nameLabel: "Name",
          domainsLabel: "Domains",
          domainsHint: "Kommagetrennt, z.B. amazon.de, amazon.com, amzn.to",
          messageLabel: "Meldung",
          messageHint: "Diese Markdown-Meldung erscheint im öffentlichen Formular als Alert.",
          enabledLabel: "Aktiviert",
          deleteRule: "Löschen",
          editRule: "Bearbeiten",
          noSelection: "Wähle links eine Regel oder lege eine neue an.",
          validationError: "Bitte prüfe die markierten Angaben vor dem Speichern.",
          nameRequired: "Bitte einen Namen angeben.",
          domainsRequired: "Bitte mindestens eine gültige Domain angeben.",
          messageRequired: "Bitte eine Markdown-Meldung angeben.",
          domainCountLabel: "{count} Domains",
          moveUp: "Nach oben",
          moveDown: "Nach unten",
          loadingEditor: "Editor lädt…",
          createRule: "Anlegen",
          saveRule: "Speichern",
          saveError: "Fehler beim Speichern. Bitte erneut versuchen.",
          dialogCreateTitle: "{name} anlegen",
          dialogEditTitle: "{name} bearbeiten",
          tableColumnName: "Name",
          tableColumnDomains: "Domains",
          tableColumnStatus: "Status",
          tableColumnActions: "",
        },
      },
      redirectUrls: {
        title: "Redirect URLs",
        hint: "Lege kurze interne URLs an, die öffentlich unter /r/name auf eine Ziel-URL weiterleiten.",
        newRedirect: "Neue Redirect URL",
        emptyTitle: "Noch keine Redirect URLs.",
        emptyHint: "Lege die erste interne URL mit Ziel-URL an.",
        active: "aktiv",
        inactive: "aus",
        defaultName: "neue-redirect-url",
        nameLabel: "Interner URL-Name",
        nameHint: "Kleinbuchstaben, Zahlen und Bindestriche. Wird als /r/name veröffentlicht.",
        targetUrlLabel: "Ziel-URL",
        targetUrlHint: "Absolute http(s)-URL, z.B. https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        publicUrlLabel: "Öffentliche Redirect-URL",
        openInNewWindowLabel: "In neuem Fenster öffnen",
        openInNewWindowDescription:
          "Versucht beim Aufruf der Redirect-URL, das Ziel in einem neuen Fenster zu öffnen.",
        enabledLabel: "Aktiviert",
        deleteRedirect: "Löschen",
        editRedirect: "Bearbeiten",
        copyPublicUrl: "Redirect-URL kopieren",
        validationError: "Bitte prüfe die markierten Angaben vor dem Speichern.",
        nameRequired: "Bitte einen gültigen internen URL-Namen angeben.",
        nameDuplicate: "Dieser interne URL-Name wird bereits verwendet.",
        targetUrlInvalid: "Bitte eine gültige http(s)-Ziel-URL angeben.",
        createRedirect: "Anlegen",
        saveRedirect: "Speichern",
        saveError: "Fehler beim Speichern. Bitte erneut versuchen.",
        dialogCreateTitle: "{name} anlegen",
        dialogEditTitle: "{name} bearbeiten",
        tableColumnName: "Name",
        tableColumnPublicUrl: "Redirect URL",
        tableColumnTargetUrl: "Ziel-URL",
        tableColumnWindow: "Fenster",
        tableColumnStatus: "Status",
        tableColumnActions: "",
        sameWindow: "Selbes Fenster",
        newWindow: "Neues Fenster",
      },
      socialPreview: {
        title: "Social Media Preview",
        editorTitle: "Editor",
        livePreviewTitle: "Live-Preview",
        chooseBackground: "Grundbild wählen",
        addText: "Text hinzufügen",
        addImage: "Bild hinzufügen",
        imageSourceUnsplash: "Unsplash",
        imageSourceAssets: "Assets",
        imageSourceComputer: "Computer",
        assetPickerTitle: "Bild aus Assets wählen",
        assetPickerEmpty: "Keine Bild-Assets verfügbar.",
        assetPickerEmptyHint: "Lade zuerst Bilder in den Asset Pool hoch.",
        addShape: "Form hinzufügen",
        newProject: "Neues Projekt",
        newProjectTitle: "Neues Projekt erstellen",
        renameAction: "Umbenennen…",
        renameProjectTitle: "Projekt umbenennen",
        renameImageTitle: "Preview-Bild umbenennen",
        projectNameLabel: "Projektname",
        imageNameLabel: "Bildname",
        projectNamePlaceholder: "Projektname eingeben…",
        noProjectLoaded: "Kein Projekt geladen",
        saveProject: "Projekt speichern",
        loadProject: "Bearbeiten",
        updatedAtLabel: "Aktualisiert",
        savedProjectsTitle: "Gespeicherte Projekte",
        imagesNavLabel: "Images",
        emptyProjectsTitle: "Noch keine Projekte gespeichert.",
        emptyProjectsHint:
          "Speichere den aktuellen Editor-Stand als Projekt, um ihn später weiterzubearbeiten.",
        projectLayer: "Projekt",
        keyboardHint:
          "Ausgewählte Objekte lassen sich per Pfeiltasten bewegen. Shift + Pfeiltaste bewegt in größeren Schritten.",
        layersTitle: "Layer",
        layersEmpty: "Noch keine Layer vorhanden.",
        resizeLayerSidebar: "Layer-Sidebar-Breite ändern",
        hideLayer: "Layer ausblenden",
        showLayer: "Layer einblenden",
        lockLayer: "Layer sperren",
        unlockLayer: "Layer freigeben",
        savedTitle: "Gespeicherte Preview-Bilder",
        emptyTitle: "Noch keine Social-Media-Previews gespeichert.",
        emptyHint: "Erstelle ein fixes Preview-Bild und aktiviere es für Open Graph und Twitter.",
        activeBadge: "Aktiv",
        defaultBadge: "Default",
        setActive: "Aktiv setzen",
        unsetActive: "Nicht aktiv setzen",
        setDefault: "Als Default setzen",
        copyShareUrl: "Share-URL kopieren",
        shareUrlCopied: "Share-URL kopiert",
        shareUrlUnavailable: "Nur das aktuell öffentliche Preview-Bild hat eine Share-URL.",
        openImage: "Öffnen",
        deleteImage: "Löschen",
        imageGridSizeLabel: "Bildgröße",
        outputTitle: "Export",
        nameLabel: "Name",
        previewNameLabel: "Preview-Name",
        formatLabel: "Format",
        qualityLabel: "Qualität",
        targetSizeLabel: "Zielgröße KB",
        targetSizeHint:
          "0 deaktiviert die Zielgröße. JPEG/WebP werden bei Bedarf kleiner gerechnet.",
        targetSizePngHint: "PNG ignoriert Qualitäts- und Zielgrößensteuerung.",
        previewMeta: "Live-Vorschau: {size}, effektive Qualität {quality}%",
        estimatedSizeLabel: "Dateigröße",
        selectionTitle: "Auswahl und Attribute",
        backgroundColor: "Hintergrundfarbe",
        backgroundZoom: "Grundbild-Zoom",
        backgroundOffsetX: "Grundbild X",
        backgroundOffsetY: "Grundbild Y",
        noSelection: "Wähle ein Text- oder Bildobjekt im Editor aus.",
        textLayer: "Textobjekt",
        imageLayer: "Bildobjekt",
        baseImageLayer: "Base Image",
        imageTintColor: "Bildfarbe",
        imageTintOpacity: "Einfärbung",
        imageBrightness: "Helligkeit",
        imageContrast: "Kontrast",
        shapeLayer: "Formobjekt",
        deleteLayer: "Objekt löschen",
        shapeKind: "Form",
        shapeRectangle: "Rechteck",
        shapeCircle: "Kreis",
        shapeEllipse: "Ellipse",
        shapePolygon: "Vieleck",
        shapeStar: "Stern",
        cornerRadius: "Eckenradius",
        radius: "Radius",
        sides: "Anzahl Ecken",
        points: "Anzahl Strahlen",
        border: "Rahmen",
        borderColor: "Rahmenfarbe",
        borderThickness: "Rahmenstärke",
        borderOpacity: "Rahmendeckkraft",
        width: "Breite",
        height: "Höhe",
        rotation: "Rotation",
        opacity: "Deckkraft",
        textContent: "Text",
        fontFamily: "Font",
        textColor: "Textfarbe",
        fontSize: "Schriftgröße",
        fontWeight: "Schriftstärke",
        fontStyle: "Schriftstil",
        fontUnderline: "Unterstreichen",
        align: "Ausrichtung",
        alignLeft: "Links",
        alignCenter: "Zentriert",
        alignRight: "Rechts",
        lineHeight: "Zeilenhöhe",
        letterSpacing: "Zeichenabstand",
        saveAndActivate: "Preview speichern",
        deleteProjectConfirmTitle: "Projekt löschen?",
        deleteProjectConfirmDescription:
          "Dieses Social-Media-Preview-Projekt wird dauerhaft gelöscht. Bereits gespeicherte Preview-Bilder bleiben erhalten.",
        deleteConfirmTitle: "Preview-Bild löschen?",
        deleteConfirmDescription:
          "Dieses Social-Media-Preview-Bild wird aus der Auswahl entfernt. Das gerenderte Media-Asset bleibt in der Mediathek erhalten.",
      },
      backgroundErrors: {
        title: "Hintergrundfehler",
        columnSource: "Quelle",
        columnMessage: "Fehlermeldung",
        columnOccurredAt: "Zeitpunkt",
        columnStatus: "Status",
        resolveAction: "Lösen",
        deleteAction: "Löschen",
        deleteConfirmTitle: "Hintergrundfehler löschen",
        deleteConfirmDescription:
          "Der Hintergrundfehler aus {source} wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.",
        statusOpen: "Offen",
        statusResolved: "Gelöst",
        noErrors: "Keine Fehler vorhanden",
        noErrorsSubtitle: "Alle Hintergrunddienste laufen fehlerfrei.",
        filterSourcePlaceholder: "Quelle filtern…",
        filterAll: "Alle",
        filterUnresolved: "Offen",
        filterResolved: "Gelöst",
      },
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
      saved: "Saved",
      sending: "Sending…",
      sendTestEmail: "Send test email",
      startCheck: "Start check",
      stopCheck: "Stop the check",
      retryCheck: "Check again",
      edit: "Edit",
      create: "Create",
      delete: "Delete",
      remove: "Remove",
      duplicate: "Duplicate",
      copy: "Copy",
      copyUrl: "Copy URL",
      availableVariables: "Available variables",
      import: "Import",
      export: "Export",
      approve: "Approve",
      reject: "Reject",
      restore: "Restore",
      putOnHold: "Put on hold",
      overwrite: "Overwrite",
      skip: "Skip",
      close: "Close",
      loading: "Loading…",
      unknownError: "Unknown error",
    },
    layout: {
      menuOpen: "Open menu",
      menuClose: "Close menu",
      resizeSidebar: "Resize sidebar",
      pageFallbackTitle: "lmaa.space",
      sidebar: {
        sectionGeneral: "General",
        sectionContent: "Content",
        sectionTemplates: "Builders",
        sectionSystem: "System",
        overview: "Overview",
        submissions: "Reports",
        shops: "Shops",
        categories: "Categories",
        landingPage: "Landing Page",
        media: "Media",
        users: "Users",
        pages: "Pages",
        pagesOverview: "Overview",
        navigations: "Navigations",
        formBuilder: "Form Builder",
        formsOverview: "Overview",
        emailTemplates: "Email Templates",
        emailTemplatesOverview: "Overview",
        socialMediaPostTemplates: "Social Media Templates",
        socialMediaPostTemplatesOverview: "Overview",
        footerBuilder: "Footer Builder",
        supportPrompts: "Support prompts",
        sponsors: "Yearly sponsors",
        sponsorRequests: "Sponsor requests",
        sponsoringSettings: "Settings",
        sectionSponsoring: "Sponsoring",
        systemSettings: "Settings",
        redirectUrls: "Redirect URLs",
        socialPreview: "Social Media Preview",
        socialPreviewImages: "Images",
        socialPreviewOverview: "Overview",
        socialMediaAccounts: "Social Media Accounts",
        backgroundErrors: "Background Errors",
        expandAll: "Expand all",
        collapseAll: "Collapse all",
        expandAllAria: "Expand all groups",
        collapseAllAria: "Collapse all groups",
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
      invite: {
        title: "Accept invitation",
        subtitle: "Set your password for dashboard access.",
        password: "Password",
        confirmPassword: "Confirm password",
        passwordMismatch: "Passwords do not match.",
        invalidLink: "The invite link is invalid or has expired.",
        submit: "Set password",
        submitLoading: "Saving...",
        toLogin: "Back to login",
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
        backgroundErrors: "Background errors",
        backgroundErrorsUnresolved: "Unresolved",
      },
    },
    shops: {
      title: "Shops",
      searchPlaceholder: "Search…",
      noShops: "No shops found.",
      noShopsHint: "Add your first shop using the + button.",
      noFilteredShopsPrefix: "No shops for",
      noFilteredShopsHint: "Choose a different visibility filter.",
      noResultsPrefix: "No results for",
      noResultsHint: "Try a different search term.",
      filters: {
        all: "All",
        public: "Public",
        onhold: "On hold",
        deleted: "Marked as deleted",
        rejected: "Rejected",
      },
      categoryFilter: {
        all: "All Categories",
      },
      table: {
        shop: "Shop",
        categories: "Categories",
        categoriesMore: "+{n} more",
        region: "Region",
        statusOnhold: "on hold",
        statusDeleted: "deleted",
        statusRejected: "rejected",
        rejectionInfo: "Rejection info",
        edit: "Edit",
        putOnHold: "Put on hold",
        restore: "Restore",
        delete: "Delete",
        permanentDelete: "Delete",
        permanentDeleteTitle: "Permanently delete shop?",
        permanentDeleteDescription:
          "The shop will be permanently removed from the database. This action cannot be undone.",
        deletionInfo: "Deletion details",
        deletedBy: "Deleted by",
        deletedAt: "Deleted at",
        deletionReason: "Reason",
        noReason: "No reason provided",
        wasReported: "Shop was reported",
        needsReview: "Review",
        likes: "Likes",
      },
      exportLabel: "Export",
      exportTooltip: "Export shops as JSON",
      importLabel: "Import",
      importTooltip: "Import review results",
      importError: "Import error",
      importInvalidFile: "Invalid file",
      editCard: {
        titleSubmissionEdit: "Edit suggestion",
        titleNew: "New shop",
        titleEdit: "Edit shop",
        publishedAt: "published at",
        openDetailPage: "Open detail page",
        previewImage: "Preview image",
        noImage: "No image set",
        openImage: "Open image in new tab",
        reloadImage: "Reload",
        setImage: "Apply",
        upload: "Upload",
        unsplash: "Unsplash",
        deleteImage: "Delete",
        errorSaving: "Error while saving.",
        rejectTitle: "Reject shop",
        rejectSubmit: "Reject",
        acceptReview: "Accept Review",
        logoBackground: {
          label: "Logo background color",
          reset: "Reset",
        },
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
        filterOrientation: "Orientation",
        orientationAll: "All",
        orientationLandscape: "Landscape",
        orientationPortrait: "Portrait",
        orientationSquarish: "Square",
        filterOrderBy: "Sort by",
        orderByRelevant: "Relevant",
        orderByLatest: "Latest",
        filterColor: "Color",
        colorAny: "Any color",
        colorBlackAndWhite: "Black & White",
        colorBlack: "Black",
        colorWhite: "White",
        colorYellow: "Yellow",
        colorOrange: "Orange",
        colorRed: "Red",
        colorPurple: "Purple",
        colorMagenta: "Magenta",
        colorGreen: "Green",
        colorTeal: "Teal",
        colorBlue: "Blue",
        selectedCount: "selected",
        addSelected: "Add",
      },
    },
    landingPage: {
      title: "Landing Page",
      tabHeroBanner: "Hero Banner",
      heroBanner: {
        addImages: "Add images",
        imagePool: "Image collection",
        imagePoolEmpty: "No images collected yet.",
        imagePoolHint: "Add images from Unsplash. Marked images will be rotated on the homepage.",
        selectedBadge: "Active",
        markSelected: "Activate for rotation",
        markDeselected: "Remove from rotation",
        markActive: "Set as active image",
        removeImage: "Remove",
        removeConfirmTitle: "Remove image?",
        removeConfirmDescription: "This image will be deleted from the collection.",
        photographerCredit: "Photo by",
        noImagesSelected:
          "No image marked as active – the default image will be shown on the homepage.",
        rotationLabel: "Rotation",
        rotationOn: "On",
        rotationOff: "Off",
        rotationInterval: "Change image after",
        rotationIntervalSuffix: "page loads",
        rotationIntervalSave: "Save",
        focalPointDrag: "Adjust focal point",
      },
    },
    media: {
      title: "Media",
      upload: "Upload files",
      uploading: "Uploading…",
      uploadHint: `Allowed: images, MP4 video, HLS folders with optional poster, PDF, TXT, MD, CSV, DOC(X), XLS(X), PPT(X). Single files up to ${MEDIA_UPLOAD_MAX_LABEL}; HLS bundles are uploaded in chunks when needed.`,
      dropTitle: "Release to upload",
      folderUploadFallbackName: "Folder",
      readingFolder: "Reading folder…",
      hlsBundleFallbackName: "HLS folder",
      readingHlsFolder: "Reading HLS folder…",
      readingFilesProgress: "{read}/{total} files read",
      uploadingHlsBundle: "Uploading HLS bundle…",
      uploadingFile: "Uploading file…",
      uploadingFilesProgress: "{uploaded}/{total} files",
      uploadProgress: "{percent}% uploaded",
      uploadProgressUnknown: "Upload in progress…",
      processingUpload: "Processing upload…",
      processingUploadHint: "The server is validating and storing the files.",
      uploadNameConflictTitle: "Name already exists",
      uploadNameConflictDescription:
        "A media asset named {name} already exists. Choose a new name or overwrite the existing asset.",
      uploadNameConflictNameLabel: "New name",
      uploadNameConflictNameTaken: "This name is already taken.",
      uploadNameConflictApplyToAll: "Apply to all conflicts in this action",
      uploadNameConflictRename: "Rename",
      uploadNameConflictOverwrite: "Overwrite",
      directoryUploadUnsupported:
        "The folder could not be read. Drag the HLS folder directly from Finder or Explorer into the media area.",
      emptyFolderUpload: "{name} does not contain readable files.",
      empty: "No files uploaded yet.",
      emptyHint:
        "Upload images, videos or documents so they can be reused in pages and other content.",
      selectPrompt: "Select a file on the left to view metadata and the internal URL.",
      selectionTitle: "Selection",
      selectedCount: "Selected files",
      selectedSize: "Total size",
      detailsTitle: "Metadata",
      previewTitle: "Preview",
      infoTitle: "File info",
      displayName: "Display name",
      originalName: "Original name",
      fileType: "File type",
      dimensions: "Dimensions",
      fileSize: "File size",
      internalUrl: "Internal URL",
      posterUrl: "Poster URL",
      createdAt: "Uploaded",
      updatedAt: "Updated",
      uploadedBy: "Uploaded by",
      linkedContentTitle: "Used in",
      linkedContentEmpty: "No linked content found.",
      linkedContentOwnerLabels: {
        project: "Project",
        post: "Post",
        page: "Page",
      },
      linkedContentRoleLabels: {
        hero: "Hero",
        preview: "Preview",
        document: "Document",
      },
      alias: "Alias",
      aliasPlaceholder: "e.g. sepa-qr",
      aliasHintEmpty: "Optional. Allowed: a-z, 0-9, dash.",
      aliasHintHls: (alias: string) => `Usage: [[hls:${alias}]]`,
      aliasHintImage: (alias: string) => `Usage: [[image:${alias}]] or [[pdf:${alias}]]`,
      aliasHintModel: "Usage as model asset.",
      saveName: "Save name",
      openFile: "Open",
      copyUrl: "Copy URL",
      copyMarkdownEmbed: "Copy Markdown embed",
      markdownEmbed: "Markdown embed",
      copied: "Copied",
      renameError: "Could not save file name.",
      uploadError: "Could not upload file.",
      loadError: "Could not load media.",
      uploadTooLarge: "{name} is too large. The maximum is {max}.",
      unsupportedPreview: "No preview is available for this file type.",
      tileSize: "Tile size",
      deleteTitle: "Delete file?",
      deleteSelected: "Delete selection",
      deleteSelectedTitle: "Delete selection?",
      deleteDescription:
        "will be permanently deleted and will no longer be reachable via its internal URL. Bundles are removed with all contents.",
      deleteSelectedDescription:
        "{count} files will be permanently deleted and will no longer be reachable via their internal URLs. Bundles are removed with all contents.",
      contextMenu: {
        openInNewTab: "Open in new tab",
        openInNewWindow: "Open in new window",
        saveToDownloads: "Save to Downloads",
        saveAs: "Save as…",
        copyAddress: "Copy address",
        copyAsset: "Copy asset",
        renameAlias: "Rename alias",
        renameDisplayName: "Rename display name",
        openFolder: "Open folder",
        renameFolderInline: "Rename folder",
        folderColorLabel: "Folder color",
        folderColorNames: {
          red: "Red",
          orange: "Orange",
          yellow: "Yellow",
          green: "Green",
          blue: "Blue",
          purple: "Purple",
          gray: "Gray",
        },
        deleteFolder: "Delete folder",
        deleteFolderWithCount: (count: number) => `Delete folder (${count})`,
        deleteAsset: "Delete asset",
        deleteSelection: "Delete selection",
        newFolder: "New folder",
        newFolderWithSelection: (count: number) => `New folder with selection (${count})`,
        addAssets: "Add assets",
      },
      folders: {
        newFolderTitle: "New folder",
        newFolderWithSelectionTitle: (count: number) => `New folder with ${count} assets`,
        renameFolderTitle: "Rename folder",
        deleteFolderTitle: "Delete folder?",
        deleteFolderConfirm: (count: number) =>
          count > 0
            ? `${count} contained items will be permanently deleted.`
            : "This folder will be permanently deleted.",
        folderNameLabel: "Folder name",
        folderNamePlaceholder: "Enter name…",
        folderNameTaken: "A folder with this name already exists.",
        itemsCount: (count: number) => `${count} items`,
        emptyFolder: "This folder is empty.",
        breadcrumbRoot: "Media",
        notFound: "The folder was not found.",
      },
      table: {
        name: "Name",
        type: "Type",
        size: "Size",
        updated: "Updated",
      },
    },
    submissions: {
      title: "Reports",
      tabs: {
        suggestions: "Suggestions",
        deadLinks: "Dead links",
        shopReports: "Shop reports",
        automatedChecks: "Automated checks",
      },
      automatedChecks: {
        columnShop: "Shop",
        columnState: "State",
        columnVerdict: "Result",
        columnModel: "Model",
        columnCost: "Cost",
        columnFinished: "Finished",
        costIncomplete:
          "One attempt of this check was missing a billable dimension. The amount is therefore a floor: at least this much was billed.",
        totalLabel: "Total",
        todayLabel: "Today",
        emptyTitle: "No automated check yet",
        emptyHint: "Once automation runs, every check appears here with what it cost.",
      },
      review: {
        title: "Automated review",
        none: "No automated review is running for this suggestion.",
        noneHint: "You can start one as soon as the mode is no longer Off.",
        stateLabel: "State",
        verdictLabel: "Result",
        modelLabel: "Checked with",
        costLabel: "Cost",
        attemptLabel: "Attempt",
        onholdLabel: "Reason for holding it back",
        proposalPrefilled:
          "The automated check recommends a rejection. The comment and the full reasoning are already in the fields of the reject dialog, with the token substituted.",
        acceptPrefilled:
          "The automated check recommends admitting this shop. Everything it researched is already in the fields on this page.",
        timelineLabel: "History",
        reportLabel: "Report",
        checkedAtLabel: "Checked on",
        resendReport: "Send again",
        states: {
          queued: "Queued",
          running: "Running",
          provider_waiting: "With the provider",
          applying: "Applying",
          completed: "Completed",
          failed: "Failed",
          cancelled: "Cancelled",
        },
        verdicts: {
          accept: "Acceptance recommended",
          reject: "Rejection recommended",
          onhold: "On hold",
        },
        progress: {
          title: "Automated check",
          elapsedLabel: "Running for",
          queuedHint: "The job is queued. The worker picks it up within 30 seconds.",
          runningHint:
            "The research is running at the provider. Depending on the model and the reasoning effort this takes a few minutes. You can close this window, the check keeps running.",
          doneHint: "The check has finished.",
          show: "Progress",
        },
        events: {
          "provider.started": "Research started at the provider",
          "provider.submitted": "Submitted to the provider, being processed",
          "result.validated": "Result checked and accepted",
          "result.repaired": "Wording corrected",
          "result.repair_failed": "Correcting the wording did not help",
          "result.invalid": "Result unusable, trying again",
          "attempt.failed": "Attempt failed",
          "result.enriched": "Findings written into the suggestion",
          "result.flagged": "Suggestion marked ready for review",
          "result.applied": "Decision applied",
          "result.conflict": "Conflict with an existing shop",
          "result.none": "Suggestion left unchanged",
          "job.cancelled": "Cancelled",
          "job.failed": "Failed",
          "report.sent": "Report sent",
          "report.failed": "Report could not be sent",
        },
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
        categoriesMore: "+{n} more",
        rejectedAt: "Rejected at",
        submittedAt: "submitted at",
        submittedBy: "submitted by",
        reject: "Reject",
        onhold: "Put on hold",
        edit: "Edit",
        approve: "Publish",
        delete: "Delete",
        confirmDeleteTitle: "Delete suggestion?",
        confirmDeleteDescription: "will be permanently removed.",
        reviewApproveTitle: "Publish suggestion",
        reviewRejectTitle: "Reject suggestion",
        comment: "Comment",
        optional: "(optional)",
        rejectReasonPlaceholder: "Reason for rejection…",
        commentPlaceholder: "Optional comment…",
        reviewErrorPrefix: "Error:",
        accept: "Publish",
        decline: "Reject",
        doneOrDecline: "Done / Reject",
        restore: "Restore",
        info: "Rejection info",
        infoTitle: "Rejection reason",
        editRejectionInfo: "Edit rejection",
        reviewEditRejectionTitle: "Edit rejection info",
        noReason: "No rejection reason provided.",
        setToOpen: "Set to new",
        rejectionLongLabel: "Long reason (public page)",
        rejectionLongPlaceholder: "Detailed reason for the rejection page…",
        exportLabel: "Export",
        exportTooltip: "Export submissions as JSON",
        importLabel: "Import",
        importTooltip: "Import review results",
        importError: "Import error",
        importInvalidFile: "Invalid file",
        reviewBadge: "Review",
        notificationLabel: "Email notification",
        notificationApproved: "Template on approval",
        notificationRejected: "Template on rejection",
        notificationNone: "Don't send email",
        notificationHint: "Only when a submitter email is available.",
        mastodonNotificationLabel: "Mastodon post",
        mastodonNotificationNone: "Don't send Mastodon post",
        mastodonNotificationHint:
          "Sent on approval through the active Mastodon accounts configured in Social Media settings.",
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
        done: "Keep",
        reject: "Reject",
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
        inviteFlowHint: "New users receive an invite link and set their password themselves.",
        welcomeTemplate: "Welcome email",
        welcomeTemplateNone: "Don't send email",
        inviteCreated: "Invite created",
        inviteHint: "You can share this link directly if no welcome email is sent.",
        inviteLink: "Invite link",
        copyInvite: "Copy link",
        inviteCopied: "Link copied",
        templateVariablesLabel: "Template variables",
        templateVariableUsername: "Username of the invited user",
        templateVariableEmail: "Email address of the invited user",
        templateVariableRole: "Role assigned to the new user",
        templateVariableInviteUrl: "One-time password setup link",
        templateVariableLoginUrl: "Regular dashboard login page",
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
        language: "Language",
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
        contentWidthLabel: "Width",
        contentWidthDefault: "Default",
        contentWidthWide: "Wide",
        contentWidthFull: "Maximum",
        ok: "OK",
        statusDraft: "Draft",
        statusPublished: "Published",
        statusHidden: "Hidden",
        showTitleLabel: "Show title",
        createdBy: "Created by",
        updatedBy: "Updated by",
        loadingContent: "Loading content…",
        saveError: "Error while saving. Please try again.",
        preview: "Preview",
        shortcuts: {
          save: "Save",
          bold: "Bold",
          italic: "Italic",
          strikethrough: "Strikethrough",
          link: "Link",
        },
      },
      footerBuilder: {
        title: "Footer Builder",
        saveError: "Error while saving",
        styleTitle: "Style",
        paletteTitle: "Blocks",
        columnsTitle: "Columns",
        addColumn: "Column",
        noSettings: "No additional settings.",
        headlineTextLabel: "Text",
        contentLabel: "Content",
        buttonLabelField: "Label",
        buttonLabelPlaceholder: "Button text",
        urlLabel: "URL",
        urlPlaceholder: "https://… or /path",
        styleLabel: "Style",
        externalLink: "External link (new tab)",
        directionLabel: "Direction",
        alignLabel: "Alignment",
        iconSizeLabel: "Icon size",
        iconsLabel: "Icons (drag to reorder)",
        iconsEmpty:
          'No footer-eligible accounts. Add one under Social Media and enable "Show in footer".',
        spacerHint: "Pushes following blocks in the column to the bottom — like SwiftUI's Spacer.",
        styleOptions: {
          filled: "Filled",
          outline: "Outline",
          ghost: "Ghost",
        },
        directionOptions: {
          vertical: "Vertical",
          horizontal: "Horizontal",
        },
        alignOptions: {
          left: "Left",
          center: "Center",
          right: "Right",
        },
        iconSizeOptions: {
          sm: "Small",
          md: "Medium",
          lg: "Large",
        },
        colorFields: {
          background: "Background",
          text: "Text",
          headlines: "Headlines",
          links: "Links",
          linkHover: "Link hover",
          button: "Button color",
          buttonText: "Button text",
        },
        sizeOptions: {
          small: "Small",
          medium: "Normal",
          large: "Large",
          extraLarge: "Extra large",
        },
        heightLabel: "Footer height",
        verticalPaddingLabel: "Vertical padding",
        previewTitle: "Footer preview",
        reloadPreview: "Reload",
        noPreviewLoaded: "No preview loaded yet.",
        moveColumn: "Move column",
        removeColumn: "Remove column",
        dragBlockHere: "Drag block here",
        removeBlock: "Remove block",
        columnSpan: {
          narrow: "Narrow",
          normal: "Normal",
          wide: "Wide",
        },
        blockLabels: {
          headline: "Headline",
          markdown: "Markdown",
          button: "Button",
          footerNav: "Footer nav",
          separator: "Separator",
          spacer: "Spacer",
          socialMedia: "Social media",
        },
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
        confirmDeleteDescription: "Do you really want to delete the following page?",
        loadPages: "Loading pages…",
        emptyPages: "No pages available yet.",
        emptyPagesHint: "Create your first page using the + button.",
        deletePageTitle: "Delete page",
        table: {
          title: "Title",
          slug: "Slug",
          status: "Status",
          createdBy: "Created by",
          updatedAt: "Updated at",
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
      canvasTitle: "Form Canvas",
      preferencesTitle: "Preferences",
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
        regionsSelect: "Shipping Regions",
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
        buttonActionCheckShop: "Check shop",
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
        allowMarkdown: "Markdown allowed",
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
      moveRow: "Move row",
      removeField: "Remove field",
      textTokensHelp: {
        open: "Formatting help",
        title: "Formatting tokens",
        description:
          "Label, placeholder, help text, content and options support typographic special characters via tokens. They are automatically replaced with the corresponding Unicode character when rendered.",
        notations: {
          title: "Three notations",
          unicodeTitle: "Unicode notation",
          unicodeBody:
            "U+XXXX (4–6 hex digits). Example: U+2011 becomes the non-breaking hyphen ‑.",
          namedTitle: "Named tokens",
          namedBody:
            "{name} using one of the names listed below. Example: {nbhy} becomes the non-breaking hyphen ‑.",
          entityTitle: "HTML entities",
          entityBody:
            "&#NNN; (decimal) or &#xHH; (hex). Example: &#8209; or &#x2011; become the non-breaking hyphen ‑.",
          edgeCaseNote:
            "Note: U+XXXX only works when the hex digits are followed by a non-hex character (e.g. space, period, comma). If a letter a–f follows directly, the token is left untouched — in that case use {nbhy} or &#8209; instead.",
        },
        tableTitle: "Available named tokens",
        cols: {
          token: "Token",
          symbol: "Symbol",
          codepoint: "Codepoint",
          description: "Description",
        },
        tokens: {
          nbhy: "Non-breaking hyphen (no line break before/after)",
          nbsp: "No-break space",
          wj: "Word joiner (invisible, prevents line break)",
          shy: "Soft hyphen (visible only at line break)",
          ndash: "En dash",
          mdash: "Em dash",
          zwj: "Zero-width joiner",
          zwnj: "Zero-width non-joiner",
        },
        exampleTitle: "Example",
        exampleInputLabel: "Input",
        exampleOutputLabel: "Result",
        exampleNote:
          "The hyphen sticks to the following word and is never wrapped onto its own line.",
        close: "Close",
      },
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
      sendTestSuccess: "Test email sent to",
      sendTestError: "Could not send the test email. Please try again.",
      systemBadge: "System",
      systemHint: "System templates cannot be deleted.",
      systemCheckbox: "System template",
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
    socialMediaTemplates: {
      listTitle: "Social Media Templates",
      newTemplate: "New Template",
      templateName: "Name",
      bodyText: "Post content",
      deleteTemplate: "Delete template",
      deleteTemplateConfirm: "Really delete this template?",
      noTemplates: "No social media templates yet.",
      noTemplatesHint: "Create your first template using the + button.",
      backToList: "← All Templates",
      save: "Save",
      saved: "Saved",
      saveError: "Error saving. Please try again.",
      nameConflict: "A template with this name already exists.",
      tableCreated: "Created",
      previewTitle: "Post preview",
      emptyPreview: "The preview appears once content is available.",
      variablesTitle: "Global variables",
      variablesHint: "You can use these placeholders in the template.",
      copyVariable: "Copy variable",
      copiedVariable: "Variable copied",
      variables: {
        shopName: "Name of the approved shop",
        shopUrl: "Original shop URL",
        shopDescription: "Description from the shop suggestion",
        shopRegion: "Regions as comma-separated list",
        shopShipping: "Shipping note",
        shopPickup: "Pickup note",
        shopContactEmail: "Shop contact email",
        shopCategories: "Shop categories",
        shopPageUrl: "Public detail page on lmaa.space",
        adminNote: "Comment from the approval dialog",
        categoryName: "Category name",
        categorySlug: "Category URL slug",
        categoryDescription: "Category description",
        categoryUrl: "Public category page on lmaa.space",
        categoryImageUrl: "Category image URL",
        frontendUrl: "Public frontend URL",
        dashboardUrl: "Dashboard URL",
      },
      systemBadge: "System",
      systemHint: "System templates cannot be deleted.",
      systemCheckbox: "System template",
      platformsLabel: "Available on:",
      platformMastodon: "Mastodon",
      platformBluesky: "Bluesky",
      bodyMastodonLabel: "Mastodon body",
      bodyBlueskyLabel: "Bluesky body",
      scopesLabel: "Scopes",
      scopes: {
        submission: "Shop submission",
        category: "Category",
        helpText: "In which dialogs can this template be selected?",
        validationMin: "At least one scope is required.",
      },
    },
    socialMedia: {
      title: "Social Media Accounts",
      editAccount: "Edit account",
      noAccounts: "No accounts configured.",
      noAccountsHint: "Add a social media account for footer links or automated postings.",
      tokenStored: "Token stored",
      tokenMissing: "No token",
      tokenRequired: "Please enter an access token.",
      saveError: "Error saving.",
      tokenInvalid: "The access token was rejected by the Mastodon instance.",
      instanceUnreachable: "The Mastodon instance is unreachable. Please check the instance URL.",
      deleteAccount: "Delete account?",
      deleteConfirm: "Really delete this account?",
      accessTokenPlaceholder: "Mastodon user access token",
      keepTokenPlaceholder: "Leave empty to keep the current token",
      addAccountTitle: "Add account",
      mastodonMaxPostCharactersLabel: "Max. characters per post",
      profileUrlLabel: "Profile URL",
      profileUrlRequired: "Please enter a profile URL.",
      labelRequired: "Please enter a label.",
      platformPickerLabel: "Pick platform",
      openLink: "Open link",
      showInFooter: "Show in footer",
      useForPosting: "Use for posting",
      postingPlatformOnly: "Posting is only available for Mastodon and Bluesky.",
      conflictForPlatform: "A posting account already exists for {platform}.",
      fields: {
        label: "Label",
        instanceUrl: "Instance URL",
        username: "Username",
        accessToken: "Access token",
        accessTokenOptional: "Access token (optional)",
        visibility: "Visibility",
        active: "Active",
      },
      badges: {
        yes: "Yes",
        no: "No",
      },
      visibility: {
        public: "Public",
        unlisted: "Unlisted",
        private: "Private",
        direct: "Direct",
      },
      columns: {
        platform: "Platform",
        account: "Account",
        identifier: "Identifier",
        profileUrl: "Profile URL",
        posting: "Posting",
        footer: "Footer",
        token: "Token",
        status: "Status",
      },
      bluesky: {
        sectionTitle: "BlueSky account",
        addAccount: "Add BlueSky account",
        empty: "No BlueSky account configured yet.",
        labelLabel: "Display name",
        handleLabel: "Handle or email",
        appPasswordLabel: "Password",
        appPasswordKeepHint: "leave empty to keep the current password",
        appPasswordRecommendation: "App password recommended — safer and 2FA-compatible.",
        appPasswordSettingsLink: "Create an app password on BlueSky",
        activeLabel: "Active",
        conflictError: "A BlueSky account is already configured.",
        invalidCredentialsError: "BlueSky rejected the credentials.",
        serviceUnreachableError: "BlueSky is unreachable.",
      },
      approve: {
        postTo: "Post to",
        noPost: "No post",
        staleChoice: "Saved choice points to a template that no longer exists",
        postOverflowWarning:
          "With the real submission values this post exceeds the platform limit.",
        approveBlockedHint: "At least one post exceeds the character limit.",
      },
    },
    system: {
      sponsors: {
        title: "Yearly sponsors",
        newSponsor: "New sponsor",
        emptyTitle: "No sponsors yet",
        emptyHint: "Whoever helps carry the running costs stands on the support page for a year.",
        nameLabel: "Name",
        firstNameLabel: "First name",
        lastNameLabel: "Last name",
        socialMediaLabel: "Online",
        socialMediaHint: "Paste an address. The picture behind it is fetched once it stands.",
        imageLabel: "Picture",
        imageHint: "Address of an image. Empty means no picture.",
        refreshPicture: "Fetch picture again",
        removePicture: "Remove picture",
        noPictureFound: "There is no picture behind this address.",
        claimLabel: "Their sentence",
        claimHint: "Why they did it. Optional.",
        publishedLabel: "Name them on the site",
        publishedHint:
          "Off means the contribution still counts towards the year, but the name stays off the page.",
        hiddenBadge: "Not named",
        amountLabel: "Amount",
        amountHint: "In euro. Never shown beside a name on the site.",
        paidAtLabel: "Paid on",
        paidAtHint: "Their year runs from this day, not from January.",
        remainingLabel: "Still stands",
        daysLeft: "days",
        expired: "Expired",
        personTitle: "Person",
        contributionTitle: "Contribution",
        costsTitle: "Running costs",
        payeeTitle: "Payee",
        payeeHint: "Where the transfers go. Shown on the payment card and encoded into the GiroCode.",
        payeeNameLabel: "Account holder",
        payeeIbanLabel: "IBAN",
        payeeBicLabel: "BIC",
        payeeBicHint: "Not needed inside the EEA.",
        variableLabel: "As a variable:",
        costsVariables: "As variables in a text: {annualCost} and {monthlyCost}",
        costsHint: "Total per year",
        costLabelLabel: "Item",
        costAmountLabel: "€ per year",
        addCost: "Add item",
        minAmountTitle: "Minimum",
        minAmountLabel: "Minimum (€)",
        minAmountHint: "The least a sponsor has to pay.",
        deleteTitle: "Delete sponsor",
        deleteMessage: "The entry disappears from the site at once.",
      },
      pendingSponsorships: {
        title: "Sponsor requests",
        emptyTitle: "Nobody is waiting",
        emptyHint: "Everybody who asked to become a sponsor on the site stands here.",
        referenceLabel: "Reference",
        announcedLabel: "Announced",
        takeOver: "Make a sponsor",
        takeOverTitle: "Make a sponsor",
        takeOverHint:
          "The amount and the day are on the statement rather than in the announcement. Everything else comes from the entry.",
        deleteTitle: "Delete announcement",
        deleteMessage: "What they wrote is gone afterwards, even if the money still arrives.",
      },
      supportPrompts: {
        title: "Support prompts",
        subtitle:
          "Short asks that stand in the flow of the site. Content in Markdown, place and rules per prompt.",
        listTitle: "Prompts",
        listHint: "One at most per slot and page view.",
        empty: "No prompt yet.",
        newPrompt: "New prompt",
        namePlaceholder: "Internal name",
        nameLabel: "Name",
        slotLabel: "Slot",
        slots: {
          myShops: "My shops",
          shopDetail: "Shop detail page",
          categoryGrid: "Category grid",
        },
        contentLabel: "Content",
        contentHint: "{shops} and {views} are replaced by the reader's own numbers.",
        buttonLabel: "Button caption",
        buttonHrefLabel: "Where it leads",
        buttonAlignmentLabel: "Button position",
        buttonAlignments: { leading: "Left", center: "Centre", trailing: "Right" },
        thresholdLabel: "From how many shops",
        thresholdHint: "Zero means from the very first visit.",
        thresholdBasisLabel: "Counting",
        thresholdBases: { viewed: "Shops seen", liked: "Shops kept" },
        startsAtLabel: "From",
        endsAtLabel: "Until",
        windowHint: "Empty means no time limit.",
        priorityLabel: "Priority",
        priorityHint: "Higher wins when two qualify for the same slot.",
        publishedLabel: "Published",
        publishedHint: "Unpublished prompts are not delivered at all.",
        limitsTitle: "Limits for all of them together",
        limitsHint: "Applies across every prompt and cannot be raised by any single one.",
        maxShownLabel: "Shown at most (times)",
        maxShownHint:
          "How often one reader sees a prompt at all, across every prompt together. Once reached, they never see another. Over 75 per cent of donations come on the first or second showing, and from the tenth on practically none.",
        snoozeDaysLabel: "Quiet period (days)",
        snoozeDaysHint:
          "How long the site stays quiet after a showing. Applies across every prompt, not just the one shown. Zero means on every page view again.",
        dismissSnoozeDaysLabel: "Quiet period after closing (days)",
        dismissSnoozeDaysHint:
          "How long the site stays quiet when somebody closes a prompt. Longer than the ordinary period, because closing one is an answer rather than an oversight. Also applies across every prompt.",
        dismissalsUntilResolvedLabel: "Closings until done",
        dismissalsUntilResolvedHint:
          "How often somebody may close the same prompt before it stops coming back. Once means 'not now', this many means 'no'. Affects that one prompt only; the others carry on.",
        devAlwaysShowLabel: "Always show (development only)",
        devAlwaysShowHint:
          "Sets every limit aside, so a prompt appears on every page view. In production the switch does nothing, even when it is on here.",
        placementTitle: "Placement",
        placementHint: "Where it sits and from when it appears. The place decides the form.",
        scheduleTitle: "Schedule",
        windowColumn: "Window",
        stateColumn: "State",
        emptyTitle: "No prompt yet",
        emptyHint: "Create one to ask for support in the flow of the site.",
        deleteTitle: "Delete prompt",
        deleteMessage:
          "It disappears from the site at once, and what readers dismissed so far is forgotten with it.",
        states: {
          draft: "Draft",
          scheduled: "Scheduled",
          live: "Visible",
          expired: "Expired",
        },
      },
      settings: {
        title: "Settings",
        notificationsTab: "Notifications",
        reviewTab: "Automated review",
        review: {
          title: "Automated review of shop suggestions",
          subtitle: "Changes take effect on the worker's next run, within thirty seconds.",
          keyMissing:
            "ANTHROPIC_API_KEY is not set. The worker stays idle until the key is present in the environment.",
          modeLabel: "Mode",
          modeOff: "Off",
          modeAssist: "Assist",
          modeHintOff:
            "Nothing is checked and nothing is billed. Incoming suggestions still queue up, so switching it on works through the backlog.",
          modeHintAssist:
            "The research is written into the suggestion and it is marked ready for review. For a recommended rejection, the comment and full reasoning are waiting in the reject dialog. You still decide, unless you allow otherwise below.",
          autoApplyTitle: "Apply without asking",
          autoApplyHint:
            "Only has an effect in Assist mode. Without these switches you still decide, and the automation only prepares.",
          autoApplyAccept: "Publish acceptances automatically",
          autoApplyReject: "Publish rejections automatically",
          notifyHint:
            "Where a template is chosen, the automation writes to whoever suggested the shop once it has decided. Without one, nothing is sent.",
          notifyAcceptTemplateLabel: "Email on an automatic admission",
          notifyRejectTemplateLabel: "Email on an automatic rejection",
          autoApplyBlocked: "Available in Assist mode only.",
          modelLabel: "Model",
          modelHint:
            "Chosen from the models the provider currently offers. The choice is recorded with every check, so a result stays tied to the model that produced it, and it sets the price per million tokens.",
          modelLoading: "Loading models…",
          effortLabel: "Reasoning effort",
          effortHint: "Higher levels research more thoroughly and cost more.",
          effortUnsupported: "This model has no reasoning effort.",
          maxAttemptsLabel: "Attempts per suggestion",
          maxAttemptsHint: "After these, the check ends as on hold.",
          costTitle: "Cost ceiling",
          costPerCheckLabel: "Per check (EUR)",
          costPerCheckHint:
            "When a single run reaches this amount it is stopped and the suggestion is put on hold.",
          costPerDayLabel: "Per day (EUR)",
          costPerDayHint:
            "Total of every check finished on one day. Once it is reached, the worker takes on no further suggestions until the next day.",
          costHint:
            "The per-check ceiling stops the running attempt. Once the daily ceiling is reached, the worker takes on no further suggestions.",
          reportTitle: "Report after every check",
          reportTemplateLabel: "Email template",
          reportHint: "Goes to OWNER_EMAIL as soon as a check finishes.",
          reportRequireTemplate: "Choose a template first to enable the report.",
          saveError: "The settings could not be saved.",
        },
        domainAlertsTab: "Domain Alerts",
        newShopSubmission: {
          title: "New shop suggestion",
          recipientLabel: "Recipient",
          recipientNotConfigured: "OWNER_EMAIL is not configured.",
          templateLabel: "Email template",
          templatePlaceholder: "Choose a template…",
          templateLoading: "Loading templates…",
          hint: "Sent whenever a new shop suggestion arrives.",
          requireTemplateHint: "Pick a template first to enable the notification.",
        },
        domainAlerts: {
          title: "Submission Domain Alerts",
          hint: "Active rules are checked in order against the submitted shop domain before the normal duplicate lookup.",
          newRule: "New Domain Alert",
          emptyTitle: "No rules yet.",
          emptyHint: "Create the first domain list with its markdown message.",
          active: "active",
          inactive: "off",
          defaultName: "New domain rule",
          nameLabel: "Name",
          domainsLabel: "Domains",
          domainsHint: "Comma-separated, e.g. amazon.de, amazon.com, amzn.to",
          messageLabel: "Message",
          messageHint: "This markdown message appears as an alert in the public form.",
          enabledLabel: "Enabled",
          deleteRule: "Delete",
          editRule: "Edit",
          noSelection: "Select a rule on the left or create a new one.",
          validationError: "Please check the highlighted fields before saving.",
          nameRequired: "Please enter a name.",
          domainsRequired: "Please enter at least one valid domain.",
          messageRequired: "Please enter a markdown message.",
          domainCountLabel: "{count} domains",
          moveUp: "Move up",
          moveDown: "Move down",
          loadingEditor: "Loading editor…",
          createRule: "Create",
          saveRule: "Save",
          saveError: "Error saving. Please try again.",
          dialogCreateTitle: "Create {name}",
          dialogEditTitle: "Edit {name}",
          tableColumnName: "Name",
          tableColumnDomains: "Domains",
          tableColumnStatus: "Status",
          tableColumnActions: "",
        },
      },
      redirectUrls: {
        title: "Redirect URLs",
        hint: "Create short internal URLs that publicly redirect from /r/name to a target URL.",
        newRedirect: "New Redirect URL",
        emptyTitle: "No Redirect URLs yet.",
        emptyHint: "Create the first internal URL with a target URL.",
        active: "active",
        inactive: "off",
        defaultName: "new-redirect-url",
        nameLabel: "Internal URL name",
        nameHint: "Lowercase letters, numbers and hyphens. Published as /r/name.",
        targetUrlLabel: "Target URL",
        targetUrlHint: "Absolute http(s) URL, e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        publicUrlLabel: "Public redirect URL",
        openInNewWindowLabel: "Open in new window",
        openInNewWindowDescription:
          "Attempts to open the target in a new window when the redirect URL is requested.",
        enabledLabel: "Enabled",
        deleteRedirect: "Delete",
        editRedirect: "Edit",
        copyPublicUrl: "Copy redirect URL",
        validationError: "Please check the highlighted fields before saving.",
        nameRequired: "Please enter a valid internal URL name.",
        nameDuplicate: "This internal URL name is already in use.",
        targetUrlInvalid: "Please enter a valid http(s) target URL.",
        createRedirect: "Create",
        saveRedirect: "Save",
        saveError: "Error saving. Please try again.",
        dialogCreateTitle: "Create {name}",
        dialogEditTitle: "Edit {name}",
        tableColumnName: "Name",
        tableColumnPublicUrl: "Redirect URL",
        tableColumnTargetUrl: "Target URL",
        tableColumnWindow: "Window",
        tableColumnStatus: "Status",
        tableColumnActions: "",
        sameWindow: "Same window",
        newWindow: "New window",
      },
      socialPreview: {
        title: "Social Media Preview",
        editorTitle: "Editor",
        livePreviewTitle: "Live preview",
        chooseBackground: "Choose base image",
        addText: "Add text",
        addImage: "Add image",
        imageSourceUnsplash: "Unsplash",
        imageSourceAssets: "Assets",
        imageSourceComputer: "Computer",
        assetPickerTitle: "Choose image from assets",
        assetPickerEmpty: "No image assets available.",
        assetPickerEmptyHint: "Upload images to the asset pool first.",
        addShape: "Add shape",
        newProject: "New project",
        newProjectTitle: "Create new project",
        renameAction: "Rename…",
        renameProjectTitle: "Rename project",
        renameImageTitle: "Rename preview image",
        projectNameLabel: "Project name",
        imageNameLabel: "Image name",
        projectNamePlaceholder: "Enter project name…",
        noProjectLoaded: "No project loaded",
        saveProject: "Save project",
        loadProject: "Edit",
        updatedAtLabel: "Updated",
        savedProjectsTitle: "Saved projects",
        imagesNavLabel: "Images",
        emptyProjectsTitle: "No projects saved yet.",
        emptyProjectsHint:
          "Save the current editor state as a project so you can continue editing it later.",
        projectLayer: "Project",
        keyboardHint:
          "Selected objects can be moved with the arrow keys. Shift + arrow key moves in larger steps.",
        layersTitle: "Layers",
        layersEmpty: "No layers yet.",
        resizeLayerSidebar: "Resize layer sidebar",
        hideLayer: "Hide layer",
        showLayer: "Show layer",
        lockLayer: "Lock layer",
        unlockLayer: "Unlock layer",
        savedTitle: "Saved preview images",
        emptyTitle: "No social media previews saved yet.",
        emptyHint: "Create a fixed preview image and activate it for Open Graph and Twitter.",
        activeBadge: "Active",
        defaultBadge: "Default",
        setActive: "Set active",
        unsetActive: "Set inactive",
        setDefault: "Set default",
        copyShareUrl: "Copy share URL",
        shareUrlCopied: "Share URL copied",
        shareUrlUnavailable: "Only the current public preview image has a share URL.",
        openImage: "Open",
        deleteImage: "Delete",
        imageGridSizeLabel: "Image size",
        outputTitle: "Export",
        nameLabel: "Name",
        previewNameLabel: "Preview name",
        formatLabel: "Format",
        qualityLabel: "Quality",
        targetSizeLabel: "Target size KB",
        targetSizeHint: "0 disables the target size. JPEG/WebP are recompressed when needed.",
        targetSizePngHint: "PNG ignores quality and target-size controls.",
        previewMeta: "Live preview: {size}, effective quality {quality}%",
        estimatedSizeLabel: "Estimated size",
        selectionTitle: "Selection and attributes",
        backgroundColor: "Background color",
        backgroundZoom: "Base image zoom",
        backgroundOffsetX: "Base image X",
        backgroundOffsetY: "Base image Y",
        noSelection: "Select a text or image object in the editor.",
        textLayer: "Text object",
        imageLayer: "Image object",
        baseImageLayer: "Base image",
        imageTintColor: "Image tint",
        imageTintOpacity: "Tint opacity",
        imageBrightness: "Brightness",
        imageContrast: "Contrast",
        shapeLayer: "Shape object",
        deleteLayer: "Delete object",
        shapeKind: "Shape",
        shapeRectangle: "Rectangle",
        shapeCircle: "Circle",
        shapeEllipse: "Ellipse",
        shapePolygon: "Polygon",
        shapeStar: "Star",
        cornerRadius: "Corner radius",
        radius: "Radius",
        sides: "Corners",
        points: "Rays",
        border: "Border",
        borderColor: "Border color",
        borderThickness: "Border thickness",
        borderOpacity: "Border opacity",
        width: "Width",
        height: "Height",
        rotation: "Rotation",
        opacity: "Opacity",
        textContent: "Text",
        fontFamily: "Font",
        textColor: "Text color",
        fontSize: "Font size",
        fontWeight: "Font weight",
        fontStyle: "Font style",
        fontUnderline: "Underline",
        align: "Alignment",
        alignLeft: "Left",
        alignCenter: "Center",
        alignRight: "Right",
        lineHeight: "Line height",
        letterSpacing: "Letter spacing",
        saveAndActivate: "Save preview",
        deleteProjectConfirmTitle: "Delete project?",
        deleteProjectConfirmDescription:
          "This social media preview project will be permanently deleted. Already saved preview images remain available.",
        deleteConfirmTitle: "Delete preview image?",
        deleteConfirmDescription:
          "This social media preview image will be removed from the selectable previews. The rendered media asset remains in the media library.",
      },
      backgroundErrors: {
        title: "Background Errors",
        columnSource: "Source",
        columnMessage: "Error message",
        columnOccurredAt: "Occurred at",
        columnStatus: "Status",
        resolveAction: "Resolve",
        deleteAction: "Delete",
        deleteConfirmTitle: "Delete background error",
        deleteConfirmDescription:
          "The background error from {source} will be permanently deleted. This action cannot be undone.",
        statusOpen: "Open",
        statusResolved: "Resolved",
        noErrors: "No errors found",
        noErrorsSubtitle: "All background services are running without errors.",
        filterSourcePlaceholder: "Filter by source…",
        filterAll: "All",
        filterUnresolved: "Open",
        filterResolved: "Resolved",
      },
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
