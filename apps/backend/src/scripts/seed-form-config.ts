/**
 * Seed script: creates the initial "suggestion-form" configuration.
 *
 * Mirrors the fields that were previously hardcoded in SuggestForm.tsx.
 * Run once after the form_configs migration:
 *   pnpm --filter backend db:seed-form-config
 */

import type { FormConfigPayload } from "@lmaa/contracts";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env.js";
import { formConfigs } from "../db/schema.js";

const INITIAL_CONFIG: FormConfigPayload = {
  rows: [
    {
      id: "row-shopName",
      fields: [
        {
          id: "shopName",
          type: "text",
          label: "Shop-Name",
          placeholder: "z.B. Naturkaufhaus Müller",
          required: true,
          width: "full",
          validation: { min: 2, max: 100 },
        },
      ],
    },
    {
      id: "row-shopUrl",
      fields: [
        {
          id: "shopUrl",
          type: "text",
          label: "Website",
          placeholder: "https://...",
          required: true,
          width: "full",
          validation: { pattern: "^https?://" },
        },
      ],
    },
    {
      id: "row-categories",
      fields: [
        {
          id: "categoryIds",
          type: "multi-select",
          label: "Kategorien",
          required: true,
          width: "full",
          optionsSource: "categories",
        },
      ],
    },
    {
      id: "row-region",
      fields: [
        {
          id: "region",
          type: "multi-select",
          label: "Region",
          required: false,
          width: "full",
          optionsSource: "regions",
        },
      ],
    },
    {
      id: "row-description",
      fields: [
        {
          id: "description",
          type: "textarea",
          label: "Beschreibung",
          placeholder: "Was macht diesen Shop besonders?",
          required: false,
          width: "full",
          validation: { max: 2000 },
        },
      ],
    },
    {
      id: "row-submitterEmail",
      fields: [
        {
          id: "submitterEmail",
          type: "email",
          label: "Deine E-Mail",
          placeholder: "fuer@rueckfragen.de",
          required: false,
          width: "full",
        },
      ],
    },
  ],
};

async function main() {
  const sql = postgres(env.DATABASE_URL);
  const db = drizzle(sql);

  const [existing] = await db
    .select()
    .from(formConfigs)
    .where(eq(formConfigs.name, "suggestion-form"));

  if (existing) {
    console.log("suggestion-form config already exists — skipping.");
  } else {
    await db.insert(formConfigs).values({
      name: "suggestion-form",
      config: INITIAL_CONFIG,
    });
    console.log("suggestion-form config created.");
  }

  await sql.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
