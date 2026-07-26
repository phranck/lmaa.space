import type { ReactDoctorConfig } from "react-doctor/api";

export default {
  lint: true,
  ignore: {
    overrides: [
      // These large editors/routes are tracked as structural refactors in LMAA-029.
      // Keep the size rule active everywhere else so new giant components still surface.
      {
        files: [
          "src/App.tsx",
          "src/components/layout/Sidebar.tsx",
          "src/components/ui/DashboardControls.tsx",
          "src/components/ui/UnsplashBrowser.tsx",
          "src/features/system/SocialPreviewPage.tsx",
          "src/ShopEditForm.tsx",
        ],
        rules: ["react-doctor/no-giant-component"],
      },
      // The social preview editor intentionally keeps independent transient state domains.
      {
        files: ["src/features/system/SocialPreviewPage.tsx"],
        rules: ["react-doctor/prefer-useReducer"],
      },
      // Controlled preference wrappers restore a parent-owned value exactly once.
      {
        files: ["src/components/ui/FilterDropdown.tsx", "src/components/ui/SegmentedControl.tsx"],
        rules: ["react-doctor/no-pass-data-to-parent"],
      },
      // These implementation modules are already behind React.lazy boundaries at their consumers.
      {
        files: [
          "src/features/analytics/AnalyticsCharts.tsx",
          "src/JsonEditor.tsx",
          "src/MarkdownEditorCore.tsx",
        ],
        rules: ["react-doctor/prefer-dynamic-import"],
      },
      // Chunk uploads and font preparation must remain ordered for progress and canvas correctness.
      {
        files: [
          "src/features/system/hooks/useAdminMedia.ts",
          "src/features/system/social-preview-renderer.ts",
        ],
        rules: ["react-doctor/async-await-in-loop"],
      },
      // Migration safety, the Drizzle run, and ownership verification are strict phases.
      {
        files: ["src/db/run-migrations.ts"],
        rules: ["react-doctor/async-parallel"],
      },
      // React Doctor's dead-code graph does not follow Astro component imports.
      {
        files: ["src/components/Header.astro", "src/components/SupportButton.astro"],
        rules: ["deslop/unused-file"],
      },
      // The dashboard bootstrap references this public asset directly from index.html.
      {
        files: ["public/theme-init.js"],
        rules: ["deslop/unused-file"],
      },
      // Both effects implement cancellation and stale-response protection around browser-side APIs.
      {
        files: ["src/components/islands/ShopFilterBar.tsx", "src/hooks/useMarkdownHtml.ts"],
        rules: ["react-doctor/no-fetch-in-effect"],
      },
      // Markdown rendering owns asynchronous DOM synchronization for its source prop.
      {
        files: ["src/hooks/useMarkdownHtml.ts"],
        rules: ["react-doctor/no-event-handler"],
      },
      // These field controls intentionally form one small compound primitive module.
      {
        files: ["src/FieldPrimitives.tsx"],
        rules: ["react-doctor/no-multi-comp"],
      },
      // The effect subscribes to document-level outside clicks while the popover is open.
      {
        files: ["src/SocialMediaEditor.tsx"],
        rules: ["react-doctor/no-event-handler"],
      },
      // Focus belongs to the roving tab triggers, not their tablist container.
      {
        files: ["src/TabsPrimitives.tsx"],
        rules: ["react-doctor/interactive-supports-focus"],
      },
      // The icon factory returns named component wrappers consumed through the exported registry.
      {
        files: ["src/ButtonIcons.tsx"],
        rules: ["react-doctor/only-export-components"],
      },
      // These custom composites implement the relevant ARIA patterns and keyboard behavior.
      {
        files: ["src/ListboxPrimitives.tsx", "src/SegmentedControlPrimitive.tsx"],
        rules: ["react-doctor/prefer-tag-over-role"],
      },
      // The vertical focal-point overlay implements the complete slider keyboard contract.
      {
        files: ["src/FocalPointOverlay.tsx"],
        rules: ["react-doctor/prefer-tag-over-role"],
      },
      // Dashboard composition APIs intentionally accept icon, title, add-on, and preview slots.
      {
        files: [
          "src/components/ui/EditorPageShell.tsx",
          "src/features/analytics/AnalyticsSection.tsx",
          "src/features/analytics/RealtimeCard.tsx",
          "src/features/analytics/TabbedMetricCard.tsx",
          "src/features/content/footer-builder/FooterBuilderPage.tsx",
          "src/features/content/landing-page/HeroBannerTab.tsx",
          "src/features/content/shops/ShopEditorFormContent.tsx",
          "src/features/content/shops/ShopEditorPage.tsx",
          "src/features/content/shops/ShopReminderSection.tsx",
          "src/features/overview/SubmissionDialogs.tsx",
          "src/features/social/AccountFormDialog.tsx",
          "src/features/social/forms/BlueskyAccountForm.tsx",
          "src/features/system/SocialPreviewPage.tsx",
          "src/features/system/settings/NotificationsTab.tsx",
          "src/features/templates/email-templates/EmailPreview.tsx",
          "src/features/templates/email-templates/EmailTemplateEditPage.tsx",
          "src/features/templates/form-builder/FormBuilderEditPage.tsx",
          "src/features/templates/form-builder/SubmissionConfigPanel.tsx",
          "src/features/templates/social-media-post-templates/SocialMediaPostTemplateEditPage.tsx",
        ],
        rules: ["react-doctor/jsx-no-jsx-as-prop"],
      },
      // These persistence wrappers synchronize controlled values with localStorage by design.
      {
        files: ["src/components/ui/FilterDropdown.tsx", "src/components/ui/SegmentedControl.tsx"],
        rules: ["react-doctor/no-event-handler"],
      },
      // Category data arrives asynchronously and initializes the reducer-backed editor once.
      {
        files: ["src/features/content/categories/CategoryEditCard.tsx"],
        rules: ["react-doctor/no-event-handler"],
      },
      // Account preferences initialize assignments and report derived overflow to the owner form.
      {
        files: ["src/features/social/components/TemplateAssignmentsSection.tsx"],
        rules: [
          "react-doctor/no-event-handler",
          "react-doctor/no-pass-data-to-parent",
          "react-doctor/no-prop-callback-in-effect",
        ],
      },
      // These mutations either invalidate through a shared helper or perform cache-neutral commands.
      {
        files: [
          "src/features/content/hooks/useFooterConfig.ts",
          "src/features/content/shops/hooks/useAdminShops.ts",
          "src/features/system/hooks/useAdminMedia.ts",
          "src/features/templates/hooks/useEmailTemplates.ts",
        ],
        rules: ["react-doctor/query-mutation-missing-invalidation"],
      },
      // The dialog barrel and compound menu deliberately mix component and support exports.
      {
        files: ["src/components/ui/Dialog.tsx", "src/components/ui/SubMenu.tsx"],
        rules: ["react-doctor/only-export-components"],
      },
      // The timer ref intentionally resolves the latest pending copy-reset handle on unmount.
      {
        files: [
          "src/features/templates/social-media-post-templates/SocialMediaPostTemplateEditPage.tsx",
        ],
        rules: ["react-doctor/exhaustive-deps"],
      },
      // The canvas editor uses proximity searches, ref-backed undo state, and React-batched resets.
      // Its application surface and adjustable separator both implement keyboard interaction.
      {
        files: ["src/features/system/SocialPreviewPage.tsx"],
        rules: [
          "react-doctor/js-index-maps",
          "react-doctor/no-cascading-set-state",
          "react-doctor/no-noninteractive-tabindex",
          "react-doctor/no-render-in-render",
          "react-doctor/prefer-tag-over-role",
          "react-doctor/rerender-state-only-in-handlers",
        ],
      },
    ],
  },
} satisfies ReactDoctorConfig;
