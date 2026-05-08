# Social Media Accounts & Footer Social Block — Design

**Date:** 2026-05-08
**Status:** Draft, awaiting user review

## Goal

Replace today's two-platform Mastodon+Bluesky account management with a generic "Social Media Accounts" surface that works for all ~20 supported platforms, while keeping the existing posting flow for Mastodon and Bluesky intact. Add a new Footer Builder block that renders the linked profile URLs as icons.

## Scope

- Dashboard Settings → Social Media: one list, one "Add account" dialog (single-step, URL-paste with auto-detect), checkbox to mark an account as posting-capable, posting fields appear inline when checked.
- Backend: extend the existing `social_media_accounts` table to be the canonical source for both profile URLs and posting credentials. Add `profile_url`, `can_post`, `show_in_footer` columns. Lift the platform-whitelist constraint and replace the global `UNIQUE(platform)` with a partial unique index that only fires for posting accounts.
- Footer Builder: new block type `social-media` with `align` and `iconSize` props. Frontend renderer fetches the profile list and renders linked icons.

## Non-Goals

- Multi-account-aware approve dialog (template choice per submission across multiple Mastodon accounts) — out of scope. The constraint stays "at most one posting account per platform" via the partial unique index.
- New posting platforms beyond Mastodon and Bluesky.
- Migration to multi-Mastodon-instance posting in the scheduler — out of scope.
- Visual redesign of the footer.

## Architecture

### Data model

The existing `social_media_accounts` table already serves as the master for posting accounts (Mastodon + Bluesky). Three columns and a constraint rework turn it into the master for *all* social media accounts.

#### New columns

| Column | Type | Default | Purpose |
| --- | --- | --- | --- |
| `profile_url` | `text NOT NULL` | (none after backfill) | Public-facing profile URL displayed in the footer and elsewhere. Always required. |
| `can_post` | `boolean NOT NULL` | `false` | True when the account has posting credentials configured. Triggers the Mastodon/Bluesky-specific column requirements (see below). |
| `show_in_footer` | `boolean NOT NULL` | `true` | Whether the Footer Social Block should render a link for this account. Independent of `is_active`. |

#### Existing columns (semantics adjusted)

- `is_active` — gated to posting. When `can_post = true`, this is the kill switch the scheduler reads. When `can_post = false`, the column has no effect on the runtime (kept for symmetry; defaults to `true`). Footer rendering is governed by `show_in_footer`, never by `is_active`.
- `access_token`, `instance_url`, `username`, `handle`, `visibility`, `max_post_characters` — relaxed to nullable where the existing schema enforces NOT NULL, and gated by conditional CHECKs (see below).

#### Constraint changes

**Drop:**

- `social_media_accounts_platform_check` — no longer restrict platform values. Any of the ~20 platforms from `PLATFORMS` (`packages/ui/src/social-media-platforms.ts`) is allowed.
- `social_media_accounts_platform_unique` — drop the global single-row-per-platform rule. Multiple profile-only rows per platform are valid.

**Replace with:**

- Partial unique index `social_media_accounts_post_unique` ON `(platform) WHERE can_post = true`. Guarantees at most one posting-active account per platform; profile-only duplicates are unrestricted.
- CHECK `social_media_accounts_can_post_platform`: `can_post = false OR platform IN ('mastodon', 'bluesky')`.
- CHECK `social_media_accounts_can_post_token`: `can_post = false OR access_token IS NOT NULL`.
- CHECK `social_media_accounts_can_post_max_chars`: `can_post = false OR max_post_characters IS NOT NULL`.
- Existing `social_media_accounts_handle_required_for_bluesky` and `social_media_accounts_instance_required_for_mastodon` are rewritten to fire only when `can_post = true`.

#### Data migration for existing rows

The current rows already represent posting accounts. Backfill:

- `can_post = true`
- `show_in_footer = true`
- `profile_url`:
    - Mastodon: `instance_url || '/@' || username` if `username IS NOT NULL`, else `instance_url`.
    - Bluesky: `'https://bsky.app/profile/' || handle`.

Migration runs as a single Drizzle migration: add columns with defaults → backfill `profile_url` from a SQL expression → drop the default → adjust nullability and CHECKs → drop and re-add indexes.

### Repository

`apps/backend/src/repositories/social-media-accounts.ts`:

- Keep `getActiveMastodonAccount` / `getActiveBlueskyAccount`. Add `AND can_post = true` to the WHERE clauses.
- Replace the platform-suffixed mutation helpers (`insertMastodonAccount`, `updateMastodonAccount`, `deleteMastodonAccount`, and Bluesky equivalents) with platform-agnostic ones: `listAccounts(filter?)`, `insertAccount(input)`, `updateAccount(id, input)`, `deleteAccount(id)`. Existing callers in `services/mastodon.ts`, `services/bluesky.ts`, `services/admin-submissions.ts` get switched to the generic helpers.
- New helper `listFooterAccounts()` returning `{ platform, profileUrl }` rows where `show_in_footer = true AND profile_url <> ''`, ordered by `platform` (matches `SocialMediaIcons` ordering).

### Contracts

Consolidate `packages/contracts/src/admin-mastodon.ts` and `admin-bluesky.ts` into a new `admin-social-media.ts`:

- `socialMediaPlatformSchema` — z.enum of all platform keys from `PLATFORMS`.
- `socialMediaAccountBaseSchema` — common fields: `id`, `platform`, `label`, `profileUrl`, `canPost`, `showInFooter`, `isActive`, `createdAt`, `updatedAt`.
- `socialMediaAccountCreateSchema` / `UpdateSchema` — discriminated schemas with `superRefine` enforcing the posting-field invariants on the client side (so the form catches errors before the round trip).
- `SocialMediaAccount` type alias replacing `MastodonAccount` / `BlueskyAccount`.

The old contract files re-export the new types as `MastodonAccount` / `BlueskyAccount` for one release while internal callers migrate. After all callers move, the old files are deleted.

### Routes

Replace `apps/backend/src/routes/admin-mastodon-account.ts` and `admin-bluesky-account.ts` with `admin-social-media-accounts.ts`:

- `GET /admin/social-media-accounts` — list all.
- `POST /admin/social-media-accounts` — create. 409 if `can_post = true` collides with the partial unique index.
- `PATCH /admin/social-media-accounts/:id` — update.
- `DELETE /admin/social-media-accounts/:id` — delete.

Public/SSR route (used by Footer.astro):

- `GET /public/social-media-accounts/footer` — returns `[{ platform, profileUrl }]` for footer rendering. Cached at the SSR layer like other public reads.

The old `/admin/mastodon-account` and `/admin/bluesky-account` paths get a redirect or 410 with deprecation note for one release. Posting services (`services/mastodon.ts`, `services/bluesky.ts`) keep their existing function signatures — only the underlying repo helpers change.

### Dashboard UI

#### `SocialMediaAccountsPage`

Columns: Platform, Label, Profile URL (truncated, click-to-copy), Posting (badge yes/no), Footer (badge yes/no), Active (toggle, only enabled when `canPost`), Actions.

Single hook: `useSocialMediaAccounts()` (replaces `useMastodonAccount` + `useBlueskyAccount`).

#### `AccountFormDialog`

Single-step dialog (no service-picker prelude). Layout:

```
┌─ Add account / Edit account ──────────────────────┐
│  Label: [_____________________]                   │
│                                                   │
│  Profile URL                                      │
│  [🌐▾]  [https://___________________________] [🔗]│
│                                                   │
│  ☑ Show in footer                                 │
│  ☐ Use for posting                                │
│                                                   │
│  ─── Posting fields (only when "use for ─── ──    │
│  ─── posting" is checked)                  ─── ── │
│                                                   │
│  Mastodon:  instanceUrl, username, accessToken,   │
│             visibility, maxPostCharacters         │
│  Bluesky:   handle, appPassword                   │
│                                                   │
│  Active toggle (top-right header)                 │
│                                  [Cancel] [Save]  │
└───────────────────────────────────────────────────┘
```

- The URL row reuses the row layout from `SocialMediaEditor.tsx`: platform-icon dropdown trigger, URL input, open-link button. `detectPlatformFromUrl` and `normalizeSocialMediaValue` from `@lmaa/shared` drive auto-detection on paste/blur.
- "Use for posting" is disabled with a tooltip when the detected platform is not in `('mastodon', 'bluesky')`.
- When "Use for posting" is checked, the existing `MastodonAccountForm` / `BlueskyAccountForm` components are mounted below, populated from the same form state. No new posting form code — only orchestration.
- "Show in footer" defaults to `true` for new accounts.
- Active toggle in the header keeps current behavior, but is only meaningful when `canPost = true` and is dimmed otherwise.

Submit goes to the new generic endpoint. 409 (partial unique index violation) maps to a localized "There is already a posting account for {platform}" message.

### Footer Builder + Renderer

#### Block schema

`packages/contracts/src/footer-config.ts`:

```ts
export const socialMediaBlockSchema = z.object({
  id: z.string(),
  type: z.literal("social-media"),
  align: z.enum(["left", "center", "right"]).default("center"),
  iconSize: z.enum(["sm", "md", "lg"]).default("md"),
});
```

Added to `footerBlockSchema` union. Type alias `SocialMediaBlock`.

#### Palette

`FooterPalette.tsx` gets a sixth tile "Social Media" with `ShareNetworkIcon` from Phosphor. `FooterBlockItem.tsx` extends `BLOCK_ABBR` with `"social-media": "SM"`.

#### Config panel

`FooterBlockConfigPanel.tsx` adds a `block.type === "social-media"` branch with two `SegmentSwitch` controls:

- Align: left / center / right.
- Icon size: small / medium / large.

`messages.content.footerBuilder.blockLabels.socialMedia` and the new option labels are added to the i18n bundle.

#### Renderer

`apps/frontend/src/components/Footer.astro`:

- New prop: `socialMediaProfiles: { platform: string; profileUrl: string }[]`.
- BaseLayout calls the new public endpoint and forwards the result.
- For `block.type === "social-media"`:

```
<div class="footer-social footer-social-{align} footer-social-{iconSize}">
  {profiles.map((p) => (
    <a href={p.profileUrl} target="_blank" rel="noopener noreferrer"
       aria-label={p.label} data-analytics-event="site-link-click"
       data-analytics-kind="footer" data-analytics-placement="footer-social"
       data-analytics-platform={p.platform}>
      <PlatformIcon platform={p.platform} />
    </a>
  ))}
</div>
```

- `PlatformIcon` is an Astro-friendly SSR helper that resolves a platform key to its react-icons / phosphor icon. The existing pattern in `SocialMediaIcons.tsx` (used SSR in `pages/shop/[token].astro`) confirms the React icon components render server-side without hydration.
- CSS additions in `FOOTER_STYLES_CSS` (`@lmaa/shared`):
    - `.footer-social { display: flex; gap: ...; }`
    - `.footer-social-left { justify-content: flex-start; }`
    - `.footer-social-center { justify-content: center; }`
    - `.footer-social-right { justify-content: flex-end; }`
    - `.footer-social-sm { font-size: 16px; gap: 0.5rem; }`
    - `.footer-social-md { font-size: 20px; gap: 0.75rem; }`
    - `.footer-social-lg { font-size: 24px; gap: 1rem; }`
- Empty state: when `socialMediaProfiles.length === 0`, the block renders nothing.

### Tests

- Backend unit tests for the new repo helpers (list, listFooterAccounts, posting filter).
- Backend integration tests for the new `/admin/social-media-accounts` routes (CRUD, 409 on posting collision, 400 on missing posting fields when `canPost = true`).
- Migration test (snapshot before/after, backfill correctness for both Mastodon and Bluesky rows).
- Dashboard component test for the new dialog (URL paste auto-detect, posting checkbox gating).
- Frontend smoke: footer renders the new block with the right alignment class.

## Decisions

- **`is_active` semantics:** narrowed to "this posting account participates in scheduling". For profile-only accounts the field is irrelevant but kept for schema simplicity (default `true`). Documented in the schema comment.
- **`show_in_footer` independence:** explicitly decoupled from `is_active` so a user can hide the footer link without affecting posting.
- **Partial unique index over CHECK:** unique-when-canPost-true is enforceable in PostgreSQL with a partial unique index, which is more standard than a CHECK with a subquery.
- **Single endpoint over per-platform endpoints:** simpler routing, simpler dashboard hooks, the platform discriminator stays in the payload.
- **No multi-Mastodon scheduler support:** the partial unique index keeps the scheduler invariant unchanged. Multi-account scheduling is a separate change with its own approve-flow design.

## Open Questions

None at this point. All decisions have been made or explicitly deferred to non-goals.

## Verified facts

- Existing table `social_media_accounts` (apps/backend/src/db/schema.ts:582) — confirmed via Read.
- Existing CHECK `social_media_accounts_platform_check` (schema.ts:601) — confirmed.
- Existing UNIQUE `social_media_accounts_platform_unique` (schema.ts:599) — confirmed.
- Existing `getActiveMastodonAccount` / `getActiveBlueskyAccount` (repositories/social-media-accounts.ts:21, :67) — confirmed.
- Posting service callers `services/mastodon.ts:90`, `services/bluesky.ts:44`, `services/admin-submissions.ts:157` — confirmed via grep.
- `social_media_accounts` referenced by `admin_user_account_template_choice` (schema.ts:835, FK with cascade delete) — confirmed.
- Footer schema in `packages/contracts/src/footer-config.ts` — confirmed (5 block types: headline, text, button, footer-nav, separator).
- Footer renderer in `apps/frontend/src/components/Footer.astro` — confirmed; renders `getButtonIconComponent` SSR.
- `SocialMediaIcons` SSR usage in `apps/frontend/src/pages/shop/[token].astro:203` — confirmed.
- `detectPlatformFromUrl`, `normalizeSocialMediaValue` exported from `@lmaa/shared` — confirmed via Read of `SocialMediaEditor.tsx`.
- `PLATFORMS`, `PLATFORM_MAP` in `packages/ui/src/social-media-platforms.ts` — confirmed (~20 entries).
- `FooterPalette.tsx`, `FooterBlockItem.tsx`, `FooterCanvas.tsx`, `FooterBlockConfigPanel.tsx` paths — confirmed.

## Plan checklist

- [ ] All code references verified (functions, scripts, paths, env vars, package-manager commands)
