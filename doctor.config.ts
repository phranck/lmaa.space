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
    ],
  },
} satisfies ReactDoctorConfig;
