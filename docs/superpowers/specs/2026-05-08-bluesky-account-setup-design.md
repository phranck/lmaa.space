# BlueSky Account Setup — Design Spec

**Date:** 2026-05-08
**Status:** Approved (pending implementation)
**Scope:** Add BlueSky as a second social-media platform alongside the existing Mastodon integration. Generalise the post-template model so a single template can target one or both platforms. Adapt the submission-approve flow so the moderator chooses, per active account, which template (if any) to use, with the choice persisted per moderator.

---

## 1. Goals & Non-Goals

### Goals
- BlueSky accounts can be created, edited, and deleted in the Dashboard.
- **At most one account per social-media platform** is allowed (one Mastodon account, one BlueSky account). Enforced by DB UNIQUE constraint and reflected in the UI as a singleton-or-empty section per platform.
- A submission approval can post to either, both, or neither of the configured Mastodon and BlueSky accounts; for each configured account the moderator picks a template (or "no post").
- Templates are stored in a single generalised table with a multi-platform tag and per-platform body variants (Mastodon body up to 500 chars, BlueSky body fixed at 300 chars).
- The Mastodon account's character limit is configurable (default 500). The BlueSky limit is a system constant of 300.
- Each moderator's last choice per platform is persisted server-side and pre-selected on the next approve dialog.

### Non-Goals
- BlueSky OAuth login (PKCE/DPoP) — App-Password is the only supported auth path.
- Custom PDS URLs — hardcoded `https://bsky.social`.
- Multiple accounts per platform — broadcast-to-many is dropped. The existing Mastodon multi-account broadcast capability is intentionally removed in Plan 2.
- BlueSky mention auto-completion or thread/reply support — first cut posts standalone records only.
- BlueSky-side health-check cron — invalid app-passwords surface as background errors at next post attempt.
- Backend dedup table for double-submit protection — UI button-disabled-state plus the existing approved-status guard are the mitigations.
- Cross-platform sharing rules beyond template `platforms` array — no per-template metadata about scheduling, retries, etc.

---

## 2. Phasing

The work is split into two sequential plans. Plan 1 must be merged and verified before Plan 2 starts.

### Plan 1 — Templates Refactor
Generalise the template table and surrounding code without introducing BlueSky behaviour. Mastodon must continue to function identically end-to-end after this plan is merged.

Scope:
- Rename `mastodonPostTemplates` to `socialMediaPostTemplates`.
- Add `platforms text[]`, `bodyMastodon text`, `bodyBluesky text`. Migrate existing `bodyText` into `bodyMastodon`. Set `platforms = ARRAY['mastodon']` for all existing rows. Drop `bodyText`.
- Rename backend repos, services, routes, and Zod schemas.
- Rename frontend hooks, pages, route paths, sidebar storage key, and i18n keys.
- Templates editor shows a disabled `[☑ Mastodon]` checkbox (visual placeholder), single body field labelled "Mastodon Body" with 500-char counter.
- Approve dialog continues to use a single `templateId` field — UI unchanged, payload key renamed (`mastodonTemplateId` → `templateId`).
- All Mastodon-specific posting logic continues to read `bodyMastodon` from the renamed table.

### Plan 2 — BlueSky Add & Account-Singleton Refactor
Add the BlueSky platform end-to-end, enforce single-account-per-platform, and convert the approve flow to per-platform template selection.

Scope:
- Extend `socialMediaAccounts.platform` enum with `'bluesky'`.
- Add `socialMediaAccounts.handle text`, `socialMediaAccounts.maxPostCharacters int NOT NULL`. Backfill `maxPostCharacters = 500` for existing Mastodon rows.
- Add UNIQUE constraint on `socialMediaAccounts(platform)`. Migration pre-condition: at most one row exists for `platform = 'mastodon'`. If more, the migration aborts and the moderator must manually delete or merge surplus accounts via the existing UI before retrying. (BlueSky has no rows yet at migration time, so it is constraint-clean by definition.)
- Create `adminUserAccountTemplateChoice` table for sticky-per-mod selections.
- Add `@atproto/api` as a backend dependency. Implement `bluesky.ts` posting service and `bluesky-account-validator.ts`.
- New routes `/admin/social-media/bluesky/accounts/*`. New endpoint `GET /admin/me/template-choices`. Existing Mastodon account routes stay at their plural paths; the singleton constraint is enforced by the DB and the create-route returns 409 if the platform already has an account.
- Refactor `sendMastodonApprovalPost` from "iterate all active accounts with one template" to a single-account call. Approve flow iterates `templateAssignments` (at most two entries — one per platform) and dispatches to the right service per assignment.
- Templates editor exposes the multi-platform checkbox group `[☐ Mastodon] [☐ BlueSky]` with conditional body fields and per-platform counters. The Mastodon counter equals `mastodonAccount?.maxPostCharacters ?? 500` (a single account, not a min-of-many).
- `SocialMediaAccountsPage` shows two sections (Mastodon, BlueSky), each in a singleton-or-empty state: empty = "Add account" CTA; configured = display row with edit/delete actions, no "Add another" button.
- Approve dialog rebuilt: at most one row per platform that has a configured account. Pool filtered by `platforms` membership matching the platform. Default selection from sticky-choice map keyed on (`adminUserId`, `accountId`), falling back to "No Post".

---

## 3. Data Model

### 3.1 `socialMediaPostTemplates` (Plan 1, replaces `mastodonPostTemplates`)

```ts
{
  id:               uuid PK,
  name:             text NOT NULL UNIQUE,
  platforms:        text[] NOT NULL,
  bodyMastodon:     text,
  bodyBluesky:      text,
  isSystemTemplate: boolean NOT NULL DEFAULT false,
  createdAt:        timestamptz NOT NULL DEFAULT now(),
  updatedAt:        timestamptz NOT NULL DEFAULT now(),
}
```

Constraints:
- DB CHECK: `cardinality(platforms) >= 1`
- DB CHECK: `array_position(platforms, 'mastodon') IS NULL OR bodyMastodon IS NOT NULL`
- DB CHECK: `array_position(platforms, 'bluesky') IS NULL OR bodyBluesky IS NOT NULL`
- App (Zod): `platforms` items must be in `['mastodon', 'bluesky']`. `bodyMastodon` ≤ 500. `bodyBluesky` ≤ 300.

Migration from `mastodonPostTemplates`:
```sql
ALTER TABLE mastodon_post_templates RENAME TO social_media_post_templates;
ALTER TABLE social_media_post_templates ADD COLUMN platforms text[] NOT NULL DEFAULT ARRAY['mastodon']::text[];
ALTER TABLE social_media_post_templates ADD COLUMN body_mastodon text;
ALTER TABLE social_media_post_templates ADD COLUMN body_bluesky text;
UPDATE social_media_post_templates SET body_mastodon = body_text;
ALTER TABLE social_media_post_templates ALTER COLUMN platforms DROP DEFAULT;
ALTER TABLE social_media_post_templates DROP COLUMN body_text;
ALTER TABLE social_media_post_templates ADD CONSTRAINT social_media_post_templates_platforms_nonempty CHECK (cardinality(platforms) >= 1);
ALTER TABLE social_media_post_templates ADD CONSTRAINT social_media_post_templates_mastodon_body CHECK (array_position(platforms, 'mastodon') IS NULL OR body_mastodon IS NOT NULL);
ALTER TABLE social_media_post_templates ADD CONSTRAINT social_media_post_templates_bluesky_body CHECK (array_position(platforms, 'bluesky') IS NULL OR body_bluesky IS NOT NULL);
```

### 3.2 `socialMediaAccounts` (Plan 2 changes)

Existing columns (unchanged):
`id, platform (enum), label, instanceUrl, username, accessToken, visibility, isActive, createdAt, updatedAt`

Plan 2 modifications:
- `platform` enum gains value `'bluesky'`.
- Add `handle text` — BlueSky handle, e.g. `lmaa.bsky.social`. Nullable; required for `platform = 'bluesky'` rows (app-layer Zod refinement).
- Add `maxPostCharacters int NOT NULL` — character cap enforced before sending. Backfill: existing Mastodon rows default to 500.
- Add UNIQUE constraint on `(platform)` so at most one row exists per platform value.

Per-platform meaning of existing columns:
- `instanceUrl` — Mastodon instance URL (e.g. `https://mastodon.social`); unused for BlueSky (always `https://bsky.social` at runtime).
- `username` — Mastodon username; for BlueSky may be a display name or empty (handle is canonical).
- `accessToken` — Mastodon OAuth bearer token; for BlueSky the App-Password (`xxxx-xxxx-xxxx-xxxx`). Stored plain, matching the existing Mastodon precedent (no encryption-at-rest in this scope).
- `visibility` — Mastodon-only; null for BlueSky rows.

Migration:
```sql
-- pre-condition: at most one Mastodon account currently exists.
-- If `SELECT count(*) FROM social_media_accounts WHERE platform = 'mastodon'` > 1,
-- the migration aborts; the moderator must manually delete or merge surplus rows first.

ALTER TYPE social_media_platform ADD VALUE 'bluesky';
ALTER TABLE social_media_accounts ADD COLUMN handle text;
ALTER TABLE social_media_accounts ADD COLUMN max_post_characters int;
UPDATE social_media_accounts SET max_post_characters = 500 WHERE platform = 'mastodon';
ALTER TABLE social_media_accounts ALTER COLUMN max_post_characters SET NOT NULL;
ALTER TABLE social_media_accounts ADD CONSTRAINT social_media_accounts_platform_unique UNIQUE (platform);
```

The pre-condition is enforced in the Drizzle migration runner: a `SELECT count(*) ... > 1` check raises before the schema-altering statements. On abort, the migration leaves the schema untouched and surfaces a clear error message naming the offending rows.

### 3.3 `adminUserAccountTemplateChoice` (Plan 2, new table)

```ts
{
  adminUserId:           int NOT NULL FK -> adminUsers(id) ON DELETE CASCADE,
  socialMediaAccountId:  int NOT NULL FK -> socialMediaAccounts(id) ON DELETE CASCADE,
  templateId:            uuid FK -> socialMediaPostTemplates(id) ON DELETE SET NULL,
  updatedAt:             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (adminUserId, socialMediaAccountId),
}
```

Semantics: `templateId IS NULL` means the moderator has explicitly chosen "no post" for this account at last approve. A row absent from this table for a given (mod, account) pair is treated as "no choice yet" → defaults to "no post" in the UI.

Because at most one account per platform exists, the table holds at most two rows per moderator (one for the Mastodon account, one for the BlueSky account, when both are configured). The PK is left as (`adminUserId`, `socialMediaAccountId`) rather than (`adminUserId`, `platform`) so that deleting and re-adding an account starts fresh — sticky preferences should not survive across "delete the Mastodon account, add a different one".

---

## 4. Backend

### 4.1 Plan 1 — Renames & Generalisation

| Old | New |
|---|---|
| `apps/backend/src/routes/admin/mastodon-post-templates.ts` | `apps/backend/src/routes/admin/social-media-post-templates.ts` |
| `apps/backend/src/repositories/mastodon-post-templates.ts` | `apps/backend/src/repositories/social-media-post-templates.ts` |
| `apps/backend/src/services/mastodon-post-templates.ts` | `apps/backend/src/services/social-media-post-templates.ts` |
| `packages/contracts/src/admin-mastodon.ts` (template part) | `packages/contracts/src/admin-social-media-templates.ts` |

Account-related Zod schemas and routes (`mastodonAccountCreateSchema`, `/admin/social-media/mastodon/accounts/*`) remain Mastodon-specific and stay in `admin-mastodon.ts` / `social-media-accounts.ts`.

The Mastodon posting service (`apps/backend/src/services/mastodon.ts`) reads `template.bodyMastodon` instead of `template.bodyText` after Plan 1. Internal iteration over active Mastodon accounts is unchanged in this plan.

Route paths:
- `/admin/mastodon-post-templates` → `/admin/social-media-post-templates`
- `/admin/mastodon-post-templates/:id` → `/admin/social-media-post-templates/:id`

Approve payload:
- `mastodonTemplateId` → `templateId` (semantic generalisation, single value, behaviour unchanged in Plan 1).

### 4.2 Plan 2 — BlueSky Service & Per-Account Approve

#### Posting service

`apps/backend/src/services/bluesky.ts` (new), uses `@atproto/api`:

```ts
import { AtpAgent, RichText } from "@atproto/api";

async function postToBlueskyAccount(account, body) {
  const agent = new AtpAgent({ service: "https://bsky.social" });
  await agent.login({ identifier: account.handle, password: account.accessToken });
  const rt = new RichText({ text: body });
  await rt.detectFacets(agent);
  return agent.post({
    text: rt.text,
    facets: rt.facets,
    createdAt: new Date().toISOString(),
  });
}
```

Behaviour notes:
- Login is performed per send (no in-memory session cache). If profiling reveals this as a hotspot, a per-process session cache keyed by `accountId` with TTL just under the JWT lifetime can be added.
- `RichText.detectFacets` covers links, mentions, and hashtags via UTF-8 byte offsets.
- Errors flow through `recordBackgroundError` analogously to `mastodon.ts`.
- Pre-send guard: if `body.length > account.maxPostCharacters` (which for BlueSky is the constant 300), the call is skipped, an error is recorded, and the function returns without invoking `agent.post`. Same guard applies to Mastodon sends.

#### Account validator

`apps/backend/src/services/bluesky-account-validator.ts` (new): wraps `agent.login(...)`, returns `{ valid: true, did }` or `{ valid: false, error }`. Used by the create/update routes after the user submits credentials.

#### Routes

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/social-media/bluesky/accounts` | list |
| POST | `/admin/social-media/bluesky/accounts` | create — runs validator before insert |
| PUT | `/admin/social-media/bluesky/accounts/:id` | update — runs validator if `accessToken` changed |
| DELETE | `/admin/social-media/bluesky/accounts/:id` | delete |
| GET | `/admin/me/template-choices` | returns `Record<accountId, templateId | null>` for the calling admin |

Repos: separate `mastodon-accounts.ts` and `bluesky-accounts.ts` for readability, both writing to the same `socialMediaAccounts` table with a `platform` predicate. The create routes return 409 Conflict if an account already exists for the platform (DB UNIQUE constraint translated by the route handler into a structured error).

#### Approve flow

`reviewAdminSubmission(payload, adminUser)` accepts a new payload shape:

```ts
{
  status: "approved" | "rejected" | "onhold",
  templateAssignments?: Array<{ accountId: number; templateId: string | null }>,
  // ... other existing fields
}
```

Algorithm when `status === "approved"`:
1. Validate that every `accountId` in `templateAssignments` refers to a configured (existing) social-media account belonging to a platform that has at most one account (it does, by UNIQUE constraint).
2. For each assignment with `templateId !== null`:
   a. Fetch account and template.
   b. Verify `template.platforms` includes `account.platform`. Reject with 400 otherwise.
   c. Verify the relevant body field is non-null (defensive — already enforced by DB CHECK).
   d. Verify `body.length <= account.maxPostCharacters`. If not, log a background error and skip the send.
   e. Dispatch to `postToMastodonAccount` or `postToBlueskyAccount`.
3. After dispatching all sends (or skipping), upsert the moderator's choice into `adminUserAccountTemplateChoice` for every assignment, including the `templateId = null` ones (sticky "no post" is a valid stored state).
4. Send dispatch is fire-and-forget (existing pattern), errors recorded asynchronously.

`templateAssignments` carries at most two entries — one per platform that has a configured account. Frontend never sends entries for platforms without a configured account; backend tolerates such entries by ignoring them but logs a warning.

Backwards compatibility: if a future client sends only `templateId` (the Plan 1 shape), the route returns 400. There is no soft fallback — Plan 2 ships the dashboard and backend in one diff.

---

## 5. Frontend

### 5.1 Plan 1 — UI Renames

File renames mirror the backend and contracts:
- `apps/dashboard/src/features/templates/mastodon-post-templates/` → `apps/dashboard/src/features/templates/social-media-post-templates/`
- Hook file and exported names: `useMastodonPostTemplates*` → `useSocialMediaPostTemplates*`
- Page components: `MastodonPostTemplate{List,Edit}Page` → `SocialMediaPostTemplate{List,Edit}Page`

Sidebar (`apps/dashboard/src/components/layout/Sidebar.tsx`):
- Storage key `sidebar-mastodon-post-templates-open` → `sidebar-social-media-post-templates-open` (one-time loss of expanded/collapsed state for users — accepted).
- Routes `/mastodon-post-templates` and `/mastodon-post-templates/:id` → `/social-media-post-templates` and `/social-media-post-templates/:id`.

Templates editor (Plan 1 view):
- New form section "Available on" with checkbox group containing only `[☑ Mastodon]`, marked as `checked + disabled` to reserve the visual real estate.
- Body field labelled "Mastodon body", 500-char counter (single source — no dynamic minimum yet).
- Submit payload: `{ name, platforms: ["mastodon"], bodyMastodon }`.

Approve dialog (`SubmissionDialogs.tsx`) Plan 1:
- Template select label updated; payload key sent as `templateId` instead of `mastodonTemplateId`.
- No structural UI change otherwise.

### 5.2 Plan 2 — Multi-Platform UI & Per-Account Approve

#### Templates editor

- `[☐ Mastodon] [☐ BlueSky]` checkbox group, mutually independent, at least one required (form-level validation).
- Conditional body fields:
  - `bodyMastodon` rendered when Mastodon is checked. Counter: `mastodonAccount?.maxPostCharacters ?? 500`. When no Mastodon account is configured, the counter falls back to 500 and the hint reads `"500 (no Mastodon account configured)"`.
  - `bodyBluesky` rendered when BlueSky is checked. Counter: fixed 300.
- Two preview cards stacked, each labelled with the platform.
- Variable helpers (`{{shopName}}` etc.) unchanged — variables apply equally to both bodies.

#### Templates list

- New "Platforms" column rendering platform badges. Filter dropdown not in this scope (deferred).

#### Social media accounts page

`SocialMediaAccountsPage` is reorganised into two stacked sections, each rendering a singleton-or-empty state:
- **Mastodon section** — when no account exists: empty placeholder with "Add Mastodon account" CTA. When configured: a single row showing label, instance URL, username, isActive toggle, edit and delete actions; no "Add another" button.
- **BlueSky section** — same shape, with handle and isActive toggle. When configured, no "Add another" button.

Mastodon account form additionally shows a `maxPostCharacters` numeric input (default 500). Validation: integer 1–11_000.

BlueSky account form: Label, Handle, App-Password. No PDS-URL field. No visibility selector. No `maxPostCharacters` input — the value is set to 300 server-side at creation. Test-connection button calls `verifyBlueskyCredentials` via the create/update path.

If the create endpoint returns 409 (account already exists for the platform), the form surfaces an inline error and the section refreshes to show the existing account.

#### Approve dialog (rebuilt)

```
Posten an
─────────────────────────────────────────────────────────────
Mastodon · @lmaa@social.coop      [▾  Welcome-Template       ]
BlueSky  · @lmaa.bsky.social      [▾  Welcome-BlueSky         ]
─────────────────────────────────────────────────────────────
```

Behaviour:
- At most two rows: one for the Mastodon account (if configured and active) and one for the BlueSky account (if configured and active). When neither is configured, the section is omitted entirely.
- Each select's options are templates whose `platforms` includes the platform of the row, plus the "— Kein Post —" entry as the first option.
- Default selection comes from `GET /admin/me/template-choices`. Missing or stale entries (template deleted, or template no longer covers this account's platform) fall back to "— Kein Post —" with an inline hint when stale: `"Letzte Auswahl ist nicht mehr für diesen Account verfügbar."`
- Submit button stays disabled while a request is in flight (mitigates double-submit duplicate-post risk).
- Payload: `templateAssignments: [{ accountId, templateId | null }, ...]` with at most two entries.

#### i18n

New keys (Plan 2):
- `socialMediaTemplates.platforms.mastodon`, `.bluesky`
- `socialMediaTemplates.bodyMastodon`, `.bodyBluesky`
- `socialMediaTemplates.counter.limitedBy`
- `socialMedia.bluesky.handle`, `.appPassword`, `.section.title`, `.empty`
- `socialMedia.mastodon.maxPostCharacters`
- `submissions.approve.postTo` (section header)
- `submissions.approve.noPost` (select option label)
- `submissions.approve.staleChoice`

---

## 6. Testing

### Plan 1 tests
- Updated `admin-mastodon-post-templates-routes.test.ts` (renamed) covering CRUD with the new `platforms` + `bodyMastodon` fields. Negative cases: empty `platforms`, `platforms = ['mastodon']` without `bodyMastodon`, name conflict on rename.
- Updated `mastodon-service.test.ts` reading `bodyMastodon` from the new schema; existing variable-substitution and rate-limit cases retained.
- Migration smoke test: count parity before/after, existing `isSystemTemplate` flag preserved.

### Plan 2 tests
- `bluesky-account-validator.test.ts`: success path, invalid credentials, network failure (mocked `AtpAgent`).
- `bluesky-service.test.ts`: send success including facet detection for a body containing a URL; rate-limit hit; pre-send length-cap rejection.
- `admin-bluesky-accounts-routes.test.ts`: CRUD, validator integration on create/update, 409 on second-account-for-platform attempt.
- `admin-mastodon-account-routes.test.ts` extended: 409 on second-Mastodon-account attempt.
- Migration test: pre-condition guard rejects when more than one Mastodon row exists; succeeds with zero or one row.
- `admin-submissions-routes.test.ts` extended: approve with `templateAssignments`, covering all matrices — Mastodon-only template + Mastodon account, BlueSky-only + BlueSky, multi-platform template + both accounts (each consuming its own body field), `templateId = null` in assignment skips the post, mismatched platform/template combos return 400, assignments referencing a non-configured platform are silently ignored with a warning log.
- Sticky-choice tests: upsert during approve, read via `/admin/me/template-choices`, stale-handling when template is deleted (FK SET NULL → UI shows "no post"), reset when the account is deleted and recreated (FK CASCADE clears the row).

### Manual verification gates
- After Plan 1 merge: approve a real submission against the staging environment; confirm the Mastodon post lands identically to before.
- After Plan 2 merge: add a BlueSky account, create a multi-platform template, approve a submission, confirm both posts land. Verify sticky pre-selection on the next approve dialog.

---

## 7. Risks & Open Questions

1. **`@atproto/api` bundle size.** Adds several MB of dependencies to the backend. Acceptable for a server runtime; no frontend impact.
2. **App-password lifecycle.** Out of scope: no health-check cron. Single-user environment makes manual recovery acceptable.
3. **Idempotency.** No cross-platform dedup table. Mastodon retains its existing per-request `Idempotency-Key` HTTP header (provided by the Mastodon API). BlueSky has no equivalent header; if `agent.post` is invoked twice for the same submission, two records are created. The realistic double-click vector is covered by the disabled-submit-button while a request is in flight plus the existing `status = approved` guard preventing a second approve on the same submission.
4. **Editor counter dynamism.** When a moderator reduces a Mastodon account's `maxPostCharacters` below the length of an existing template body, the template is not auto-shortened. Posts to that account will fail the pre-send length check and surface as background errors. Acceptable; the moderator can edit the template.
5. **Multi-platform template with one platform's body removed later.** When a moderator unchecks a platform on a template that previously had a body for that platform, the update endpoint sets the corresponding body column to NULL atomically with the `platforms` change. The DB CHECK constraint only enforces that a body exists when its platform is selected; it does not forbid a body lingering after the platform is unchecked. The "clear orphan body on platform deselect" rule is therefore an application-layer invariant in the update route, not a DB constraint.

6. **Migration pre-condition (more than one Mastodon account).** The Plan 2 migration aborts if the existing DB holds more than one Mastodon account row. The moderator must delete or merge surplus rows manually via the existing dashboard UI before retrying the migration. Risk is low for the current single-user setup (no surplus rows expected) but documented for completeness.

---

## 8. Verified Facts

Code references that this design depends on, verified against the repo at design time:

| Reference | Verified at | Path |
|---|---|---|
| `mastodonPostTemplates` table | `apps/backend/src/db/schema.ts` lines 613–623 | DB schema |
| `socialMediaAccounts` table with `platform` enum | `apps/backend/src/db/schema.ts` lines 580–608 | DB schema |
| `adminUsers` table + `requireAdmin` middleware | `apps/backend/src/db/schema.ts` line 186 + `apps/backend/src/middleware/auth.ts` | auth layer |
| `sendMastodonApprovalPost` posting entry-point | `apps/backend/src/services/mastodon.ts` lines 121–163 | posting pipeline |
| `reviewAdminSubmission` approve handler | `apps/backend/src/services/admin-submissions.ts` lines 49–100 | approve pipeline |
| Existing Mastodon route `/admin/social-media/mastodon/accounts` | `apps/backend/src/routes/admin/social-media-accounts.ts` | routing |
| Existing Mastodon-template route `/admin/mastodon-post-templates` | `apps/backend/src/routes/admin/mastodon-post-templates.ts` | routing |
| `MASTODON_POST_TEMPLATE_VARIABLES` constant | `packages/contracts/src/admin-mastodon.ts` lines 7–20 | template variables |
| `SubmissionDialogs.tsx` MastodonTemplateSelect (lines 390–397, 443–475) | `apps/dashboard/src/features/overview/SubmissionDialogs.tsx` | approve dialog |
| Sidebar group key `sidebar-mastodon-post-templates-open` | `apps/dashboard/src/components/layout/Sidebar.tsx` lines 340–375 | sidebar state |

Implementation plans must re-verify each of these references at plan-write time and again at plan-execute time per `~/.claude/rules/plan-verification.md`.

---

## 9. Out-of-Scope Follow-Ups

- BlueSky session caching with refresh-JWT handling.
- BlueSky reply/thread posts (e.g. quoting the shop entry).
- Per-template platform filter on the templates list page.
- Account health-check cron (for both platforms).
- Admin-user template choice introspection ("which moderator chose what for which account").
- Encryption-at-rest for stored access tokens / app passwords.
