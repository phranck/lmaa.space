import type { ReactDoctorConfig } from "react-doctor/api";

export default {
  lint: true,
  ignore: {
    overrides: [
      // The support ladder and the support prompt both show page content that
      // the server already rendered and sanitised through the site's own
      // Markdown pipeline, the same one the article around them goes through.
      // Nothing in either comes from a visitor.
      {
        files: [
          "src/components/islands/SupportLadder.tsx",
          "src/components/islands/SupportPromptSlot.tsx",
        ],
        rules: ["react-doctor/no-danger"],
      },
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
      // Whether a prompt shows is decided once on mount, and it is decided from
      // things that do not exist whilst the page renders: the reader's counters
      // in localStorage and whether another slot has already claimed the page.
      // The same pass writes those counters back and reports the showing, so it
      // is a side effect rather than a value that could be worked out in render.
      {
        files: ["src/components/islands/SupportPromptSlot.tsx"],
        rules: ["react-doctor/no-derived-state", "react-doctor/no-event-handler"],
      },
      // The social preview editor intentionally keeps independent transient state domains.
      {
        files: ["src/features/system/SocialPreviewPage.tsx"],
        rules: ["react-doctor/prefer-useReducer"],
      },
      // The support ladder carries the whole donation interface in one island.
      // Splitting it and modelling its tab and amount as one machine is tracked
      // in issue #138, rather than reported as a regression on every scan.
      {
        files: ["src/components/islands/SupportLadder.tsx"],
        rules: ["react-doctor/no-giant-component", "react-doctor/prefer-useReducer"],
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
          "src/features/content/donations/charts/IncomeOverTimeChart.tsx",
          "src/features/content/donations/charts/PaymentRouteChart.tsx",
        ],
        rules: ["react-doctor/prefer-dynamic-import"],
      },
      // All three put something beside a title through an `addOn`, which is how
      // the dashboard does it: the chart page a view switch, the bank
      // connection page and the sidebar entry the badge saying what state the
      // connection is in. Hoisting any of them would separate it from the state
      // it reads.
      {
        files: [
          "src/components/layout/Sidebar.tsx",
          "src/features/content/donations/DonationChartsPage.tsx",
          "src/features/system/bank-connection/BankConnectionPage.tsx",
        ],
        rules: ["react-doctor/jsx-no-jsx-as-prop"],
      },
      // The funding bar reports a value inside a known range, which is what
      // `meter` means. The HTML element of that name carries a rendering the
      // browsers disagree about and will not take the card's own tokens, so the
      // role goes on a styled element with the full figure in `aria-valuetext`.
      {
        files: ["src/features/content/donations/charts/FundingProgressBar.tsx"],
        rules: ["react-doctor/prefer-tag-over-role"],
      },
      // The date formatters are built once per language and period size and
      // held in a module-level map. The rule sees the constructor inside a
      // function and cannot see the cache around it.
      {
        files: ["src/features/content/donations/charts/chart-axis.ts"],
        rules: ["react-doctor/js-hoist-intl"],
      },
      // Every donation mutation invalidates through one shared helper, so the
      // three queries a saved payment shows up in cannot be forgotten one at a
      // time. The rule looks for the invalidation inside `onSuccess` itself.
      {
        files: ["src/features/content/donations/hooks/useDonations.ts"],
        rules: ["react-doctor/query-mutation-missing-invalidation"],
      },
      // Starting a bank authorisation answers with the bank's own address and
      // changes nothing the dashboard holds. What it does change is decided at
      // the bank, and the browser leaves this page to go there, so there is no
      // cached answer that could go stale behind it.
      {
        files: ["src/features/system/bank-connection/hooks/useBankConnection.ts"],
        rules: ["react-doctor/query-mutation-missing-invalidation"],
      },
      // Chunk uploads and font preparation must remain ordered for progress and canvas correctness.
      {
        files: [
          "src/features/system/hooks/useAdminMedia.ts",
          "src/features/system/social-preview-renderer.ts",
        ],
        rules: ["react-doctor/async-await-in-loop"],
      },
      // The favicon candidates are tried in order and the first one that answers
      // wins. Fetching them at the same time would ask a stranger's site for
      // several images to use one of them.
      {
        files: ["src/services/favicon.ts"],
        rules: ["react-doctor/async-await-in-loop"],
      },
      // A reference is drawn again only because the one before it turned out to
      // be taken, so the attempts are a sequence rather than independent work.
      {
        files: ["src/services/pending-sponsorships.ts"],
        rules: ["react-doctor/async-await-in-loop"],
      },
      // The picture is looked for on the most telling service first and the
      // search stops at the first hit. Asking every service at once would send
      // a request to each of a sponsor's platforms whenever the first already
      // answered.
      {
        files: ["src/services/sponsor-avatar.ts"],
        rules: ["react-doctor/async-await-in-loop"],
      },
      // Migration safety, the Drizzle run, and ownership verification are strict phases.
      {
        files: ["src/db/run-migrations.ts"],
        rules: ["react-doctor/async-parallel"],
      },
      // Reading a stream is sequential by definition: each chunk only exists once
      // the previous read resolved, and the size ceiling is enforced as they arrive.
      {
        files: ["src/lib/http-body.ts"],
        rules: ["react-doctor/async-await-in-loop"],
      },
      // The geocoder tries the most specific query first and stops at the first
      // hit. Asking all of them at once would send every query to a third party
      // even when the first one already answered.
      {
        files: ["src/lib/geocoding.ts"],
        rules: ["react-doctor/async-await-in-loop"],
      },
      // An image is asked for again only because the attempt before it neither
      // answered nor failed, and a pause sits between the two. Asking three
      // times at once would send a stranger's server three requests to answer
      // one question.
      {
        files: ["src/lib/og.ts"],
        rules: ["react-doctor/async-await-in-loop"],
      },
      // Waiting for a provider batch is a polling loop against a deadline, so
      // each pass depends on the one before it.
      {
        files: ["src/services/review/anthropic-provider.ts"],
        rules: ["react-doctor/async-await-in-loop"],
      },
      // Both sites run inside one transaction, which is one connection. Issuing
      // their statements at the same time does not make them concurrent; it
      // gives up the ordering the row locks depend on.
      {
        files: ["src/repositories/review-jobs.ts"],
        rules: ["react-doctor/async-await-in-loop", "react-doctor/async-parallel"],
      },
      // Sending the finished check's report is deliberately ahead of the mode
      // guard, because delivery has a setting of its own. Moving it below would
      // leave reports for completed checks unsent whenever the review mode is
      // switched off.
      {
        files: ["src/services/review/worker.ts"],
        rules: ["react-doctor/async-defer-await"],
      },
      // React Doctor's dead-code graph does not follow Astro component imports.
      {
        files: ["src/components/Header.astro", "src/components/SupportButton.astro"],
        rules: ["deslop/unused-file"],
      },
      // Same blind spot, one level down: the analytics script address and its
      // integrity hash are read by BaseLayout.astro, which the graph does not
      // follow, so both look unused from here.
      {
        files: ["src/lib/csp.ts"],
        rules: ["deslop/unused-export"],
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
          "src/features/content/donations/DonationsPage.tsx",
          "src/features/content/footer-builder/FooterBuilderPage.tsx",
          "src/features/content/landing-page/HeroBannerTab.tsx",
          "src/features/content/shops/ShopEditorFormContent.tsx",
          "src/features/content/shops/ShopEditorPage.tsx",
          "src/features/content/shops/ShopReminderSection.tsx",
          "src/features/content/sponsors/SponsoringSettingsPage.tsx",
          "src/features/content/support-prompts/SupportPromptEditorPage.tsx",
          "src/features/content/support-prompts/SupportPromptsPage.tsx",
          "src/features/overview/SubmissionDialogs.tsx",
          "src/features/overview/SubmissionReviewPanel.tsx",
          "src/features/social/AccountFormDialog.tsx",
          "src/features/social/forms/BlueskyAccountForm.tsx",
          "src/features/system/SocialPreviewPage.tsx",
          "src/features/system/settings/NotificationsTab.tsx",
          "src/features/system/settings/ReviewTab.tsx",
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
      // The automated check writes into a suggestion whilst a moderator may have
      // it open, so a new revision reseeds the form. That is resetting state
      // when a prop changes, guarded by the revision it was seeded from, rather
      // than a value that could be worked out while rendering.
      {
        files: ["src/features/content/shops/hooks/useShopEditorController.ts"],
        rules: ["react-doctor/no-derived-state"],
      },
      // The reload watches a check finishing, which is observed by polling and
      // has no event handler to move into: nothing the moderator does triggers
      // it.
      {
        files: ["src/features/overview/hooks/useReviewJob.ts"],
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
          "src/features/content/sponsors/hooks/useSponsors.ts",
          "src/features/system/hooks/useAdminMedia.ts",
          "src/features/templates/hooks/useEmailTemplates.ts",
        ],
        rules: ["react-doctor/query-mutation-missing-invalidation"],
      },
      // The dialog barrel, the compound menu and the badge deliberately mix
      // component and support exports. A badge's tones are the vocabulary that
      // component understands, so they belong beside it rather than in a file
      // every caller has to know about separately.
      {
        files: [
          "src/components/ui/Badge.tsx",
          "src/components/ui/Dialog.tsx",
          "src/components/ui/SubMenu.tsx",
        ],
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
