# Category Post Templates — Design

**Date:** 2026-05-09
**Status:** Draft (awaiting user review)

## Goal

Beim Anlegen einer neuen Kategorie soll der Admin — analog zum Submission-Approve-Flow — Social-Media-Post-Templates pro aktivem Mastodon-/Bluesky-Account auswählen können. Backend postet im Hintergrund.

## Scope (in)

- Template-Auswahl-Section im New-Category-Dialog (`CategoryEditCard.tsx`, nur wenn `categoryId === "new"`).
- Template-Tabelle bekommt Multi-Scope-Feld (`scopes: ('submission'|'category')[]`); ein Template kann für einen oder beide Kontexte gelten.
- Sticky-Choice-Tabelle wird scope-aware (Singular `scope` als zusätzlicher PK-Bestandteil).
- Backend-Post-Pipeline wird auf eine diskriminierte `PostContext`-Union generalisiert; Submission-Pfad bleibt funktional identisch.
- Templates-Verwaltungs-UI bekommt Scope-Multi-Select (mind. 1 erforderlich).

## Scope (out)

- Posten beim **Bearbeiten** einer Kategorie. Section erscheint ausschließlich beim Anlegen.
- Admin-Comment-Variable im Category-Dialog. Variablen-Set bleibt rein kategorie-bezogen.
- Migration der existierenden `messages.socialMedia.approve.*` i18n-Keys in einen neutraleren Namespace. Strings sind generisch genug, um in beiden Kontexten zu wirken; Rename ist optional und kein Blocker.

## Non-Goals

- Verbesserung der bestehenden Submission-Flow-UX. Refactor ist transparent.
- Rate-Limit- oder Idempotency-Logik wird nicht angefasst (außer Idempotency-Key bekommt Entity-Discriminator).

---

## Architecture

**Variant A** (gewählt): Generic + Extract.

- Backend: Diskriminierte `PostContext = { kind: "submission", … } | { kind: "category", … }`.
- Frontend: `TemplateAssignmentsSection` aus `SubmissionDialogs.tsx` wird in `apps/dashboard/src/features/social/components/` extrahiert und mit einem `previewBody`-Callback parametrisiert.
- DB: `scopes`-Array auf `social_media_post_templates`, singularer `scope` auf `admin_user_account_template_choice` (PK-Erweiterung).

---

## Data Model

### Migration `0051_template_scope`

Generierung via `npm run db:generate` aus dem Repo-Root (drizzle-kit, siehe `drizzle.config.ts`). Anwendung beim Backend-Start via `npm run db:migrate -w @lmaa/backend` (Backend-Migrator-Script).

**Tabelle `social_media_post_templates`** (heute: `apps/backend/src/db/schema.ts:643-668`)

```sql
ALTER TABLE social_media_post_templates
  ADD COLUMN scopes text[] NOT NULL DEFAULT ARRAY['submission']::text[];

ALTER TABLE social_media_post_templates
  ADD CONSTRAINT social_media_post_templates_scopes_nonempty
  CHECK (cardinality(scopes) >= 1);

ALTER TABLE social_media_post_templates
  ADD CONSTRAINT social_media_post_templates_scopes_valid
  CHECK (scopes <@ ARRAY['submission', 'category']::text[]);
```

Das Pattern spiegelt das existierende `platforms[]`-Feld (CHECK auf `cardinality >= 1`) und folgt dem `social_media_post_templates_platforms_nonempty`-Vorbild aus dem heutigen Schema (Zeile 657-659).

**Tabelle `admin_user_account_template_choice`** (heute: `apps/backend/src/db/schema.ts:844-861`)

```sql
ALTER TABLE admin_user_account_template_choice
  ADD COLUMN scope text NOT NULL DEFAULT 'submission';

ALTER TABLE admin_user_account_template_choice
  ADD CONSTRAINT admin_user_account_template_choice_scope_valid
  CHECK (scope IN ('submission', 'category'));

ALTER TABLE admin_user_account_template_choice
  DROP CONSTRAINT admin_user_account_template_choice_pkey;

ALTER TABLE admin_user_account_template_choice
  ADD CONSTRAINT admin_user_account_template_choice_pkey
  PRIMARY KEY (admin_user_id, social_media_account_id, scope);
```

Bestehende Zeilen erben `scope='submission'` und bleiben unter dem neuen PK gültig.

### Drizzle Schema (`apps/backend/src/db/schema.ts`)

- `socialMediaPostTemplates`: neues Feld `scopes: text("scopes").array().notNull().default(sql\`ARRAY['submission']::text[]\`)` plus zwei `check`-Constraints analog zu den Plural-Pendants für `platforms`.
- `adminUserAccountTemplateChoice`: neues Feld `scope: text("scope").$type<"submission" | "category">().notNull().default("submission")`. PK in `(table) => [primaryKey({ columns: [table.adminUserId, table.socialMediaAccountId, table.scope] }), …]`.

---

## Contracts (`packages/contracts/src/`)

### `admin-social-media-templates.ts`

```ts
export const SOCIAL_MEDIA_POST_TEMPLATE_SCOPES = ["submission", "category"] as const;
export type SocialMediaPostTemplateScope = (typeof SOCIAL_MEDIA_POST_TEMPLATE_SCOPES)[number];

export interface SocialMediaPostTemplate {
  id: number;
  name: string;
  platforms: SocialMediaPlatform[];
  scopes: SocialMediaPostTemplateScope[];   // NEW
  bodyMastodon: string | null;
  bodyBluesky: string | null;
  isSystemTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export const socialMediaPostTemplateCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    platforms: z.array(z.enum(SOCIAL_MEDIA_PLATFORMS)).min(1),
    scopes: z.array(z.enum(SOCIAL_MEDIA_POST_TEMPLATE_SCOPES)).min(1),  // NEW
    bodyMastodon: z.string().nullable().optional(),
    bodyBluesky: z.string().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    // existing platform/body checks remain
    // new: scopes uniqueness
    if (new Set(value.scopes).size !== value.scopes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scopes"],
        message: "scopes must not contain duplicates",
      });
    }
  });

export const socialMediaPostTemplateUpdateSchema = socialMediaPostTemplateCreateSchema;
```

### `admin-categories.ts`

```ts
export const categoryBodySchema = z.object({
  // existing fields …
  templateAssignments: z
    .array(
      z.object({
        accountId: z.number().int().positive(),
        templateId: z.number().int().positive().nullable(),
      }),
    )
    .optional(),
});
```

---

## Backend

### `apps/backend/src/services/post-context.ts` (neu)

```ts
import type { Category, Submission } from "@lmaa/shared";
import { env } from "../config/env.js";
import { encodeShopToken } from "./shop-tokens.js";  // existing helper

export type PostContext =
  | {
      kind: "submission";
      submission: Submission;
      newShopId: number;
      adminNote: string;
      categoryNames: string[];
    }
  | {
      kind: "category";
      category: Category;
    };

export function buildPostVariables(ctx: PostContext): Record<string, string> {
  if (ctx.kind === "submission") {
    return {
      shopName: ctx.submission.shopName,
      shopUrl: ctx.submission.shopUrl,
      shopDescription: ctx.submission.description ?? "",
      shopRegion: Array.isArray(ctx.submission.region) ? ctx.submission.region.join(", ") : "",
      shopShipping: ctx.submission.shipping ?? "",
      shopPickup: ctx.submission.pickup ?? "",
      shopContactEmail: ctx.submission.contactEmail ?? "",
      shopCategories: ctx.categoryNames.join(", "),
      shopPageUrl: `${env.FRONTEND_URL}/shop/${encodeShopToken(ctx.newShopId)}`,
      adminNote: ctx.adminNote,
      frontendUrl: env.FRONTEND_URL,
      dashboardUrl: env.DASHBOARD_URL,
    };
  }
  return {
    categoryName: ctx.category.name,
    categorySlug: ctx.category.slug,
    categoryDescription: ctx.category.description ?? "",
    categoryUrl: `${env.FRONTEND_URL}/category/${ctx.category.slug}`,
    categoryImageUrl: ctx.category.imageUrl ?? "",
    frontendUrl: env.FRONTEND_URL,
    dashboardUrl: env.DASHBOARD_URL,
  };
}

export function idempotencyEntityKey(ctx: PostContext): string {
  return ctx.kind === "submission"
    ? `submission:${ctx.submission.id}`
    : `category:${ctx.category.id}`;
}
```

`apps/backend/src/services/mastodon.ts` und `apps/backend/src/services/bluesky.ts` werden umgestellt:
- `ApprovalPostContext` (heute `mastodon.ts:39`) wird Type-Alias auf `Extract<PostContext, { kind: "submission" }>` (Übergangs-Lesbarkeit; entfernbar wenn alle Aufrufer migriert sind).
- `buildApprovalPostVariables` (heute `mastodon.ts:50`) wird zu `buildPostVariables` (re-exportiert aus `post-context.ts`).
- `postToMastodonAccount` (`mastodon.ts:85-…`) und `postToBlueskyAccount` (`bluesky.ts:42-…`) nehmen `PostContext` statt `ApprovalPostContext`.
- Idempotency-Key (heute `mastodon.ts:70-78`) ruft `idempotencyEntityKey(ctx)` statt hartkodiertem `submission:${submission.id}`.

### `apps/backend/src/services/dispatch-template-assignments.ts` (neu)

`dispatchTemplateAssignments` lebt heute privat in `apps/backend/src/services/admin-submissions.ts:108-170`. Wird extrahiert:

```ts
import type { PostContext } from "./post-context.js";
import type { SocialMediaPostTemplateScope } from "@lmaa/contracts";

export async function dispatchTemplateAssignments(
  adminUserId: number,
  scope: SocialMediaPostTemplateScope,
  assignments: Array<{ accountId: number; templateId: number | null }>,
  context: PostContext,
): Promise<void> {
  for (const assignment of assignments) {
    try {
      await upsertChoice(adminUserId, assignment.accountId, assignment.templateId, scope);
    } catch (err) {
      await recordBackgroundError("template-choice-upsert", err, { adminUserId, accountId: assignment.accountId });
    }

    if (assignment.templateId === null) continue;

    try {
      const account = await getAccountById(assignment.accountId);
      if (!account || !account.isActive) continue;
      const template = await getSocialMediaPostTemplateById(assignment.templateId);
      if (!template) {
        await recordBackgroundError(/* … */);
        continue;
      }
      if (!template.scopes.includes(scope)) {
        await recordBackgroundError(`${account.platform}-post`, new Error(
          `template ${template.id} does not cover scope ${scope}`,
        ), { accountId: account.id, templateId: template.id });
        continue;
      }
      if (!template.platforms.includes(account.platform)) {
        await recordBackgroundError(/* … */);
        continue;
      }
      if (account.platform === "mastodon") {
        await postToMastodonAccount(account, template, context);
      } else {
        await postToBlueskyAccount(account, template, context);
      }
    } catch (err) {
      await recordBackgroundError("social-media-post", err, { /* … */ });
    }
  }
}
```

`admin-submissions.ts` ruft `dispatchTemplateAssignments(adminId, "submission", …, postContext)`.

### `apps/backend/src/repositories/admin-user-account-template-choice.ts`

```ts
import type { SocialMediaPostTemplateScope } from "@lmaa/contracts";

export async function listChoicesForAdminUser(
  adminUserId: number,
  scope: SocialMediaPostTemplateScope,
): Promise<AdminUserAccountTemplateChoice[]> {
  return db
    .select()
    .from(adminUserAccountTemplateChoice)
    .where(
      and(
        eq(adminUserAccountTemplateChoice.adminUserId, adminUserId),
        eq(adminUserAccountTemplateChoice.scope, scope),
      ),
    );
}

export async function upsertChoice(
  adminUserId: number,
  socialMediaAccountId: number,
  templateId: number | null,
  scope: SocialMediaPostTemplateScope,
): Promise<void> {
  await db
    .insert(adminUserAccountTemplateChoice)
    .values({ adminUserId, socialMediaAccountId, templateId, scope, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [
        adminUserAccountTemplateChoice.adminUserId,
        adminUserAccountTemplateChoice.socialMediaAccountId,
        adminUserAccountTemplateChoice.scope,
      ],
      set: { templateId, updatedAt: new Date() },
    });
}
```

### `apps/backend/src/repositories/social-media-post-templates.ts`

- `listSocialMediaPostTemplates(scope?: SocialMediaPostTemplateScope)`: optionaler Filter via `WHERE ${scope}::text = ANY(scopes)`.
- `insert`/`update` schreiben `scopes`-Array.

### Service-Layer für Category-Create

`apps/backend/src/services/admin-categories.ts` enthält heute nur Image-Lifecycle-Funktionen (`uploadManagedAdminCategoryImage`, `setManagedAdminCategoryUnsplashImage`, `removeManagedAdminCategoryImage`). Die `createAdminCategory`-Funktion lebt im Repo (`apps/backend/src/repositories/admin-categories.ts`) und wird heute direkt von der Route aufgerufen.

Neue Service-Funktion in `apps/backend/src/services/admin-categories.ts`:

```ts
export interface CreateCategoryWithPostsInput {
  name: string;
  slug: string;
  description?: string | null;
  templateAssignments?: Array<{ accountId: number; templateId: number | null }>;
  adminId: number;
}

export async function createCategoryWithPosts(input: CreateCategoryWithPostsInput): Promise<Category> {
  const category = await createAdminCategory({
    name: input.name,
    slug: input.slug,
    description: input.description,
  });

  if (input.templateAssignments?.length) {
    const ctx: PostContext = { kind: "category", category };
    void dispatchTemplateAssignments(input.adminId, "category", input.templateAssignments, ctx);
  }

  return category;
}
```

### Routes

**`apps/backend/src/routes/admin/categories.ts:39`** (POST `/admin/categories`)

Heute:
```ts
categoriesRoutes.post("/categories", zValidator("json", categoryBodySchema), async (c) => {
  const body = c.req.valid("json");
  const category = await createAdminCategory(body);
  return ok(c, category, 201);
});
```

Neu:
```ts
categoriesRoutes.post("/categories", zValidator("json", categoryBodySchema), async (c) => {
  const body = c.req.valid("json");
  const adminId = c.get("adminId");
  const category = await createCategoryWithPosts({ ...body, adminId });
  return ok(c, category, 201);
});
```

`adminId` ist verfügbar via `requireAuth`-Middleware (Mount in `apps/backend/src/routes/admin/index.ts:43`).

**`apps/backend/src/routes/admin/me-template-choices.ts`** (GET `/me/template-choices`)

Heute liefert die Route die Map `{ accountId -> templateId | null }` ohne Scope-Param. Wird erweitert:

```ts
const querySchema = z.object({
  scope: z.enum(SOCIAL_MEDIA_POST_TEMPLATE_SCOPES),
});

meTemplateChoicesRoutes.get(
  "/me/template-choices",
  zValidator("query", querySchema),
  async (c) => {
    const adminId = c.get("adminId");
    const { scope } = c.req.valid("query");
    const rows = await listChoicesForAdminUser(adminId, scope);
    const map: Record<number, number | null> = {};
    for (const row of rows) map[row.socialMediaAccountId] = row.templateId;
    return ok(c, map);
  },
);
```

Backwards-Kompat: Frontend wird im selben Release umgestellt; ältere Clients ohne Scope-Param erhalten `400`.

**`apps/backend/src/routes/admin/social-media-post-templates.ts`** (GET-Liste)

Optionaler Query-Param `?scope=submission|category` filtert serverseitig.

---

## Frontend (Dashboard)

### Komponenten-Extraktion

Neue Datei `apps/dashboard/src/features/social/components/TemplateAssignmentsSection.tsx`. Inhalt entspricht weitgehend dem heutigen privaten Component in `apps/dashboard/src/features/overview/SubmissionDialogs.tsx:457-605`, mit folgenden Änderungen:

```ts
export interface TemplateAssignmentsSectionProps {
  templates: SocialMediaPostTemplate[];        // bereits scope-gefiltert vom Caller
  scope: SocialMediaPostTemplateScope;         // für useTemplateChoices
  assignments: TemplateAssignment[];
  onChange: (next: TemplateAssignment[]) => void;
  open: boolean;
  previewBody: (template: SocialMediaPostTemplate, platform: "mastodon" | "bluesky") => string;
  onOverflowChange: (hasOverflow: boolean) => void;
}
```

Intern unverändert: nutzt weiterhin `usePostingAccount("mastodon")` und `usePostingAccount("bluesky")` aus `apps/dashboard/src/features/social/hooks/useSocialMediaAccounts.ts`. `useTemplateChoices` wird mit `scope`-Param aufgerufen.

`SubmissionDialogs.tsx` importiert die Section neu und übergibt:
- `scope="submission"`,
- `previewBody` als Adapter, der `renderPostPreview(body, { submission, adminNote, categories })` aus dem heutigen `apps/dashboard/src/features/overview/post-preview.ts` nutzt.

### Hooks

**`apps/dashboard/src/features/social/hooks/useTemplateChoices.ts`**

```ts
export function useTemplateChoices(scope: SocialMediaPostTemplateScope) {
  return useQuery({
    queryKey: ["me-template-choices", scope] as const,
    queryFn: () => api.get<Record<number, number | null>>(
      `/admin/me/template-choices?scope=${scope}`,
    ),
  });
}
```

Aufrufer: `TemplateAssignmentsSection` (intern, mit dem props.scope).

**`apps/dashboard/src/features/templates/hooks/useSocialMediaPostTemplates.ts`**

```ts
export function useSocialMediaPostTemplates(scope?: SocialMediaPostTemplateScope) {
  return useQuery({
    queryKey: ["social-media-post-templates", scope ?? "all"] as const,
    queryFn: () => api.get<SocialMediaPostTemplate[]>(
      scope ? `/admin/social-media-post-templates?scope=${scope}` : `/admin/social-media-post-templates`,
    ),
  });
}
```

Aufrufer:
- `SubmissionEditorPage.tsx:133` → bleibt `useSocialMediaPostTemplates()` (alle, oder optional `"submission"` — clean).
- `SocialMediaPostTemplateListPage.tsx` → `useSocialMediaPostTemplates()` (alle, weil Verwaltungs-Liste).
- `CategoryEditCard.tsx` (neu) → `useSocialMediaPostTemplates("category")`.

### Category-Post-Preview

Neue Datei `apps/dashboard/src/features/content/categories/category-post-preview.ts`:

```ts
import { FRONTEND_URL } from "@/lib/env.ts";

interface CategoryPostPreviewContext {
  category: { name: string; slug: string; description: string; imageUrl: string | null };
}

const VAR_REGEX = /\{\{(\w+)\}\}/g;

export function renderCategoryPostPreview(body: string | null, ctx: CategoryPostPreviewContext): string {
  if (!body) return "";
  const dashboardUrl = typeof window !== "undefined" ? window.location.origin : "";
  const variables: Record<string, string> = {
    categoryName: ctx.category.name,
    categorySlug: ctx.category.slug,
    categoryDescription: ctx.category.description,
    categoryUrl: `${FRONTEND_URL}/category/${ctx.category.slug}`,
    categoryImageUrl: ctx.category.imageUrl ?? "",
    frontendUrl: FRONTEND_URL,
    dashboardUrl,
  };
  return body.replace(VAR_REGEX, (_, name: string) => variables[name] ?? "");
}
```

`FRONTEND_URL` kommt aus `apps/dashboard/src/lib/env.ts` (heute schon konsumiert in `FooterBuilderPage.tsx`, `ShopTable.tsx`, `post-preview.ts`).

### `CategoryEditCard.tsx`

Änderungen scoped auf `categoryId === "new"`:

1. `useSocialMediaPostTemplates("category")`-Query starten (nur wenn `isNew`).
2. Lokaler State:
   ```ts
   const [templateAssignments, setTemplateAssignments] = useState<TemplateAssignment[]>([]);
   const [hasPostOverflow, setHasPostOverflow] = useState(false);
   ```
3. Section unterhalb der Description-Textarea (vor den Footer-Buttons in `<OverlayCard>`):
   ```tsx
   {isNew && templates.length > 0 && (
     <TemplateAssignmentsSection
       templates={templates}
       scope="category"
       assignments={templateAssignments}
       onChange={setTemplateAssignments}
       open={true}
       previewBody={(t, platform) =>
         renderCategoryPostPreview(
           platform === "mastodon" ? t.bodyMastodon : t.bodyBluesky,
           { category: { name: form.name, slug: form.slug, description: form.description, imageUrl: image.previewUrl } },
         )
       }
       onOverflowChange={setHasPostOverflow}
     />
   )}
   ```
4. Save-Button: `disabled={!canSave || hasPostOverflow}`.
5. Overflow-Hint im Footer (parallel zum Approve-Dialog).

### `useSaveCategory`

Mutation-Input erweitert um `templateAssignments?: TemplateAssignment[]`. Nur bei `isNew` und nicht-leer wird das Feld in den POST-Body gehängt:

```ts
mutationFn: async ({ form, image, templateAssignments }) => {
  let saved: Category;
  if (isNew) {
    const body = templateAssignments?.length
      ? { ...form, templateAssignments }
      : form;
    saved = await api.post<Category>("/admin/categories", body);
  } else {
    saved = await api.patch<Category>(`/admin/categories/${categoryId}`, form);
  }
  // image flow unchanged …
}
```

### Templates-Verwaltung

**`apps/dashboard/src/features/templates/social-media-post-templates/SocialMediaPostTemplateListPage.tsx`**
- Neue Spalte `Scopes` (Badge-Liste, e.g. `Submission` `Category`).

**`apps/dashboard/src/features/templates/social-media-post-templates/SocialMediaPostTemplateEditPage.tsx`**
- Neuer Form-Block: zwei Checkboxen (`Submission`, `Category`). Mind. eine muss aktiv sein.
- Variable-Hilfetext schaltet je nach aktiver Scope-Auswahl: `submission`-only zeigt Shop-Variablen, `category`-only zeigt Category-Variablen, beide aktiv zeigt beide Sets mit Hinweis "wird je nach Kontext gefüllt; nicht passende Variablen rendern leer".

### i18n

Neue Keys (Schema; finale Strings beim Implementieren):
- `messages.socialMediaPostTemplates.scopes.{submission,category}` (Checkbox-Labels)
- `messages.socialMediaPostTemplates.scopesHelpText`
- `messages.socialMediaPostTemplates.scopesValidation` ("mindestens ein Scope erforderlich")

`messages.socialMedia.approve.{postTo,noPost,staleChoice,postOverflowWarning,approveBlockedHint}` bleiben unverändert; die Strings funktionieren in beiden Kontexten ausreichend gut.

---

## Tests

### Backend

- `apps/backend/src/__tests__/dispatch-template-assignments.test.ts` (neu): scope-mismatch (template.scopes=['submission'], dispatch-scope='category') → `recordBackgroundError`, kein Post.
- `apps/backend/src/__tests__/mastodon-service.test.ts` und `bluesky-service.test.ts`: zusätzliches Suite-Block für `kind: "category"` PostContext, korrekte Variable-Substitution (categoryName, categoryUrl etc.).
- `apps/backend/src/__tests__/admin-categories-service.test.ts`: `createCategoryWithPosts` ruft `dispatchTemplateAssignments` mit category-context (gemockt).
- `apps/backend/src/__tests__/admin-user-account-template-choice.test.ts` (falls existiert; sonst neu): scope-keyed upsert, scope-keyed list.
- `apps/backend/src/__tests__/admin-me-template-choices-routes.test.ts` (heute existent): scope-Query-Param required, `400` ohne Param.
- `apps/backend/src/__tests__/admin-submissions-service.test.ts`: bestehender Test bleibt grün; nur `upsertChoice`-Aufruf bekommt jetzt `"submission"`-Param.

### Frontend
Dashboard hat heute keine Unit-Tests. Manuelle Smoke-Tests beim Stage-Merge:
1. Submission-Approve: Templates erscheinen nur wenn `scopes` enthält `submission`.
2. New Category: Templates erscheinen nur wenn `scopes` enthält `category`. Section nicht sichtbar wenn `templates.length === 0`.
3. Template mit `scopes=['submission','category']` erscheint in beiden Dialogen.
4. Edit existierender Kategorie: Section nicht sichtbar.
5. Sticky-Choice pro Scope getrennt — Submission-Auswahl bleibt unverändert, wenn man parallel im Category-Dialog auswählt.
6. Overflow-Detection blockt Save-Button im Category-Dialog.
7. Templates-Verwaltung: Scope-Multi-Select speichert/lädt; Validierung erzwingt mind. einen Scope.

---

## Risks

- **PK-Migration auf `admin_user_account_template_choice`**: DROP CONSTRAINT + ADD CONSTRAINT muss in einer Transaktion ablaufen. Drizzle generiert das tendenziell sauber, manuell verifizieren (bei Bedarf SQL-Statement im generierten Migration-File anpassen).
- **GET `/me/template-choices` Backwards-Kompat**: Scope-Param ist ab jetzt required. Alle Frontend-Aufrufer im selben Release migrieren; sonst bekommt der Approve-Dialog `400`.
- **Overflow-State bei initial leerem Form**: Bei `isNew` ist `category.name`/`slug`/`description` leer. `previewBody` rendert entsprechend kurze Strings; Overflow-Detection bleibt korrekt (kein false-positive, weil renderResult kürzer als limit).

---

## Open Questions

Keine offenen Punkte; Sektionen 1-3 wurden im Brainstorming bestätigt.

---

## Verified facts

- `TemplateAssignmentsSection` (privat) — `apps/dashboard/src/features/overview/SubmissionDialogs.tsx:457-605`, gegrep'd.
- Submission post-preview helper — `apps/dashboard/src/features/overview/post-preview.ts`, Read.
- `ApprovalPostContext` interface — `apps/backend/src/services/mastodon.ts:39`, Read.
- `buildApprovalPostVariables` — `apps/backend/src/services/mastodon.ts:50`, Read.
- `dispatchTemplateAssignments` (privat) — `apps/backend/src/services/admin-submissions.ts:108-170`, Read.
- `upsertChoice`, `listChoicesForAdminUser` — `apps/backend/src/repositories/admin-user-account-template-choice.ts`, Read.
- `social_media_post_templates` Drizzle-Tabelle — `apps/backend/src/db/schema.ts:643-668`, Read.
- `admin_user_account_template_choice` Drizzle-Tabelle — `apps/backend/src/db/schema.ts:844-861`, Read.
- `GET /me/template-choices` Route — `apps/backend/src/routes/admin/me-template-choices.ts`, Read.
- `POST /admin/categories` Route + `categoryBodySchema` — `apps/backend/src/routes/admin/categories.ts:39`, Read.
- Admin-Auth-Middleware (`requireAuth` injiziert `adminId`) — `apps/backend/src/routes/admin/index.ts:43`, gegrep'd.
- `categoryBodySchema` — `packages/contracts/src/admin-categories.ts:6`, gegrep'd.
- Template-Schema-File — `packages/contracts/src/admin-social-media-templates.ts`, gegrep'd.
- `useTemplateChoices` Hook — `apps/dashboard/src/features/social/hooks/useTemplateChoices.ts`, Read.
- `useSocialMediaPostTemplates` Hook — `apps/dashboard/src/features/templates/hooks/useSocialMediaPostTemplates.ts`, gegrep'd.
- `FRONTEND_URL` Dashboard-Import-Pattern — `import { FRONTEND_URL } from "@/lib/env.ts"`, gegrep'd in `FooterBuilderPage.tsx`, `ShopTable.tsx`, `post-preview.ts`.
- Drizzle config — `drizzle.config.ts` (Repo-Root), Read. Schema-Pfad: `./apps/backend/src/db/schema.ts`. Out: `./apps/backend/drizzle`.
- Migration-Generierung: `npm run db:generate` (Repo-Root, drizzle-kit). Anwendung: `npm run db:migrate -w @lmaa/backend`.
- Nächste Migrations-Nummer: `0051_*` (vorhandene: `0050_social_media_accounts_generic.sql`).
- Repo-Funktion `createAdminCategory` — `apps/backend/src/repositories/admin-categories.ts` (heute direkt von Route konsumiert; Service-Wrapper neu zu erstellen).
- Service-File für Category — `apps/backend/src/services/admin-categories.ts` (heute nur Image-Lifecycle; bekommt neue `createCategoryWithPosts`-Funktion).

## Plan checklist

- [x] All code references verified (functions, scripts, paths, env vars, package-manager commands)
