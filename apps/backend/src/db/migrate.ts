import postgres from "postgres";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const sql = postgres(process.env.DATABASE_URL);

  console.log("Running migrations...");

  // Tables are created in dependency order to satisfy FK constraints.

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id                     SERIAL PRIMARY KEY,
      name                   TEXT NOT NULL UNIQUE,
      slug                   TEXT NOT NULL UNIQUE,
      icon                   TEXT NOT NULL DEFAULT '',
      description            TEXT NOT NULL DEFAULT '',
      sort_order             INTEGER NOT NULL DEFAULT 0,
      image_url              TEXT,
      image_photographer     TEXT,
      image_photographer_url TEXT,
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id            SERIAL PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_owner      BOOLEAN NOT NULL DEFAULT FALSE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shops (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      url           TEXT NOT NULL,
      category_id   INTEGER NOT NULL REFERENCES categories(id),
      region        TEXT NOT NULL DEFAULT '',
      pickup        TEXT NOT NULL DEFAULT '',
      shipping      TEXT NOT NULL DEFAULT '',
      description   TEXT NOT NULL DEFAULT '',
      og_image      TEXT,
      is_active     BOOLEAN NOT NULL DEFAULT TRUE,
      search_vector TSVECTOR,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    DO $do$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'shops' AND column_name = 'category_id') THEN
        CREATE INDEX IF NOT EXISTS idx_shops_category ON shops(category_id);
      END IF;
    END $do$
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_shops_active   ON shops(is_active)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_shops_fts      ON shops USING GIN(search_vector)`;

  await sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id                  SERIAL PRIMARY KEY,
      shop_name           TEXT NOT NULL,
      shop_url            TEXT NOT NULL,
      category_id         INTEGER REFERENCES categories(id),
      category_suggestion TEXT,
      region              TEXT NOT NULL DEFAULT '',
      pickup              TEXT NOT NULL DEFAULT '',
      shipping            TEXT NOT NULL DEFAULT '',
      description         TEXT NOT NULL DEFAULT '',
      submitter_email     TEXT,
      submitter_note      TEXT,
      status              TEXT NOT NULL DEFAULT 'pending'
                            CHECK(status IN ('pending','approved','rejected')),
      admin_note          TEXT,
      feedback_sent       BOOLEAN NOT NULL DEFAULT FALSE,
      reviewed_by         INTEGER REFERENCES admin_users(id),
      reviewed_at         TIMESTAMPTZ,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status)`;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id            TEXT PRIMARY KEY,
      admin_user_id INTEGER NOT NULL REFERENCES admin_users(id),
      expires_at    TIMESTAMPTZ NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`;

  await sql`
    CREATE TABLE IF NOT EXISTS dead_link_reports (
      id          SERIAL PRIMARY KEY,
      shop_id     INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      ip_hash     TEXT NOT NULL,
      reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_dlr_shop ON dead_link_reports(shop_id)`;

  // FTS: trigger function + trigger for auto-updating search_vector
  await sql`
    CREATE OR REPLACE FUNCTION shops_search_vector_update() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('german', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('german', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('german', coalesce(NEW.shipping, '')), 'C');
      RETURN NEW;
    END $$ LANGUAGE plpgsql
  `;

  await sql`DROP TRIGGER IF EXISTS shops_search_vector_trigger ON shops`;
  await sql`
    CREATE TRIGGER shops_search_vector_trigger
    BEFORE INSERT OR UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION shops_search_vector_update()
  `;

  // Additive migrations (idempotent – no-ops if columns already exist)
  await sql`ALTER TABLE shops       ADD COLUMN IF NOT EXISTS og_image      TEXT`;
  await sql`ALTER TABLE shops       ADD COLUMN IF NOT EXISTS search_vector TSVECTOR`;
  await sql`ALTER TABLE categories  ADD COLUMN IF NOT EXISTS image_url              TEXT`;
  await sql`ALTER TABLE categories  ADD COLUMN IF NOT EXISTS image_photographer     TEXT`;
  await sql`ALTER TABLE categories  ADD COLUMN IF NOT EXISTS image_photographer_url TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS content_pages (
      slug       TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      content    TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Seed static content pages (no-op if already present)
  await sql`
    INSERT INTO content_pages (slug, title, content) VALUES
    ('about', 'Über uns', E'## Was ist lmaa.space?\n\nlmaa.space ist eine Community-kuratierte Sammlung von Online-Shops als Alternativen zu Amazon – für den deutschsprachigen Raum. Alle Shops werden manuell geprüft, bevor sie aufgenommen werden.\n\n## Wie kann ich mitmachen?\n\nGanz einfach: [Schlage einen Shop vor](/vorschlagen). Kein Account, keine Registrierung. Wir prüfen deinen Vorschlag und nehmen ihn bei Eignung auf.\n\n## Wer steckt dahinter?\n\nlmaa.space ist ein privates Community-Projekt ohne kommerzielle Interessen. Alle Kosten (Hosting, Domain) werden selbst getragen. Es gibt keine Affiliate-Links und kein Tracking.\n\nDas Ursprungsprojekt begann als [Markdown-Liste auf Codeberg](https://codeberg.org/phranck/Amazon-Alternativen). Diese Web-App macht das Projekt für alle zugänglicher.\n\n## Datenschutz\n\nKein Google Analytics. Kein Facebook-Pixel. Keine Tracking-Cookies. Sieh dir unsere [Datenschutzerklärung](/datenschutz) an.'),
    ('impressum', 'Impressum', E'## Angaben gem. § 5 ECG\n\nFrank Gregor  \nLandstrasse 21c  \n6900 Bregenz  \nÖsterreich\n\n## Kontakt\n\nE-Mail: [hallo@lmaa.space](mailto:hallo@lmaa.space)\n\n## Medieninhaber gem. § 25 MedienG\n\nFrank Gregor, Landstrasse 21c, 6900 Bregenz, Österreich\n\n**Grundlegende Richtung:** lmaa.space ist ein privates, nicht-kommerzielles Community-Projekt. Zweck ist die Sammlung und Präsentation von unabhängigen Online-Shops als Alternativen zu Amazon für den deutschsprachigen Raum. Es besteht kein Erwerbszweck, keine Affiliate-Vergütung und kein Tracking.\n\n## Bildnachweise\n\nAlle in den Kategorien verwendeten Fotos sind frei verfügbare Bilder von [Unsplash](https://unsplash.com) und stehen unter der [Unsplash License](https://unsplash.com/license). Eine kommerzielle Nutzung oder Weiterverbreitung der Fotos ist ohne ausdrückliche Genehmigung der jeweiligen Fotografen nicht gestattet.\n\n## Haftungsausschluss\n\nTrotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich. Die aufgelisteten Shops wurden manuell geprüft; eine laufende Überwachung ist ohne konkrete Hinweise jedoch nicht zumutbar.'),
    ('aufnahmekriterien', 'Aufnahmekriterien', E'## Welche Shops werden aufgenommen?\n\nlmaa.space listet unabhängige Online-Shops als Alternativen zu Amazon – für den deutschsprachigen Raum. Alle Vorschläge werden manuell geprüft.\n\n## Kriterien\n\n- **Eigenständiger Online-Shop** – kein Marktplatz, kein Amazon-Seller, keine Subdomain eines Großkonzerns\n- **Deutschsprachiges Angebot** – die Website muss auf Deutsch verfügbar sein\n- **Zuverlässiger Versand** – Lieferung nach Deutschland, Österreich oder der Schweiz\n- **Kein Dropshipping** ohne eigene Lagerware oder erkennbaren Mehrwert\n- **Kein reines Affiliate-Portal** – der Shop muss selbst verkaufen\n\n## Was wird abgelehnt?\n\n- Shops mit ausschließlich englischsprachigem Angebot\n- Marktplätze (z. B. eBay, Etsy, Kaufland Marketplace)\n- Shops mit fragwürdiger Geschäftspraxis oder negativen Erfahrungsberichten\n- Duplikate bereits gelisteter Shops\n\n## Vorschlag einreichen\n\nDu kennst einen Shop, der hier fehlt? [Schlag ihn vor](/vorschlagen) – kein Account nötig.'),
    ('datenschutz', 'Datenschutzerklärung', E'*Gem. Art. 13 und 14 DSGVO sowie § 1 DSG (Österreich)*\n\n## 1. Verantwortlicher\n\nVerantwortlicher im Sinne der DSGVO ist:\n\nFrank Gregor  \nLandstrasse 21c  \n6900 Bregenz, Österreich  \nE-Mail: [hallo@lmaa.space](mailto:hallo@lmaa.space)\n\n## 2. Grundsätze\n\nDer Schutz deiner personenbezogenen Daten hat für uns höchste Priorität. lmaa.space wurde von Grund auf datenschutzfreundlich konzipiert: Es werden keine Tracking-Cookies gesetzt, keine Analyse-Dienste von Drittanbietern eingebunden und keine personenbezogenen Daten an Dritte weitergegeben oder verkauft.\n\nEs gibt keine Nutzerkonten, keine Registrierung und keine Profilbildung. Werbung wird nicht ausgespielt.\n\n## 3. Hosting\n\nDiese Website wird ausschließlich auf Infrastruktur von [Zerops](https://zerops.io) betrieben. Die Server befinden sich in Tschechien, einem Mitgliedsstaat der Europäischen Union. Eine Übermittlung von Daten in Drittstaaten außerhalb der EU findet nicht statt.\n\n## 4. Serverprotokolle\n\nBeim Aufruf dieser Website speichert der Webserver automatisch technische Zugriffsdaten in sogenannten Serverprotokollen. Dazu gehören:\n\n- IP-Adresse des anfragenden Geräts\n- Datum und Uhrzeit des Zugriffs\n- Aufgerufene URL\n- HTTP-Statuscode\n- Übertragene Datenmenge\n\nDiese Daten werden ausschließlich zur Sicherstellung des technischen Betriebs sowie zur Erkennung und Abwehr von Angriffen benötigt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.\n\n## 5. Vorschlagsformular\n\nWenn du über das Formular unter [/vorschlagen](/vorschlagen) einen Shop einreichst, werden folgende Angaben gespeichert:\n\n- Name und URL des vorgeschlagenen Shops\n- Gewählte oder vorgeschlagene Kategorie\n- Optionale Beschreibung\n- Optionale E-Mail-Adresse (ausschließlich für Rückmeldungen zum Vorschlag)\n\nRechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch Absenden des Formulars).\n\n## 6. Keine Cookies, datenschutzfreundliche Statistiken\n\nDiese Website setzt keinerlei Cookies und verwendet keine Tracking-Dienste wie Google Analytics, Meta Pixel oder vergleichbare Anbieter.\n\nZur Erfassung anonymer Nutzungsstatistiken wird eine selbstgehostete Instanz von [Umami](https://umami.is) eingesetzt. Umami ist eine quelloffene, datenschutzfreundliche Analysesoftware, die ohne Cookies auskommt und keine personenbezogenen Daten speichert. IP-Adressen werden nicht gespeichert.\n\n## 7. Externe Links\n\nDiese Website enthält Links zu externen Shops und Websites. Beim Klick auf einen solchen Link verlässt du lmaa.space. Für die Datenschutzpraktiken der verlinkten Websites sind ausschließlich deren Betreiber verantwortlich.\n\n## 8. Deine Rechte\n\nGemäß DSGVO stehen dir folgende Rechte zu:\n\n- **Auskunft** (Art. 15 DSGVO)\n- **Berichtigung** (Art. 16 DSGVO)\n- **Löschung** (Art. 17 DSGVO)\n- **Einschränkung der Verarbeitung** (Art. 18 DSGVO)\n- **Widerspruch gegen die Verarbeitung** (Art. 21 DSGVO)\n- **Datenübertragbarkeit** (Art. 20 DSGVO)\n\nZur Ausübung deiner Rechte wende dich bitte per E-Mail an [hallo@lmaa.space](mailto:hallo@lmaa.space).\n\n## 9. Beschwerderecht\n\nDu hast das Recht, bei der österreichischen Datenschutzbehörde Beschwerde einzulegen:\n\nÖsterreichische Datenschutzbehörde  \nBarichgasse 40–42  \n1030 Wien  \n[www.dsb.gv.at](https://www.dsb.gv.at)\n\n## 10. Aktualität dieser Erklärung\n\nDiese Datenschutzerklärung ist aktuell gültig und hat den Stand Februar 2026.')
    ON CONFLICT (slug) DO NOTHING
  `;

  // Replace single-column shop indexes with a compound index for faster filtered queries
  await sql`DROP INDEX IF EXISTS idx_shops_category`;
  await sql`DROP INDEX IF EXISTS idx_shops_active`;
  await sql`
    DO $do$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'shops' AND column_name = 'category_id') THEN
        CREATE INDEX IF NOT EXISTS idx_shops_category_active ON shops (category_id, is_active);
      END IF;
    END $do$
  `;

  // Multi-category: junction table shop_categories
  await sql`
    CREATE TABLE IF NOT EXISTS shop_categories (
      shop_id     INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (shop_id, category_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_sc_category ON shop_categories(category_id)`;

  // Migrate existing shop→category assignments into junction table
  await sql`
    DO $do$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'shops' AND column_name = 'category_id') THEN
        INSERT INTO shop_categories (shop_id, category_id)
        SELECT id, category_id FROM shops WHERE category_id IS NOT NULL
        ON CONFLICT DO NOTHING;
      END IF;
    END $do$
  `;

  // Multi-category for submissions: add category_ids + backfill (only when legacy category_id still exists)
  await sql`
    DO $do$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'submissions' AND column_name = 'category_id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'submissions' AND column_name = 'category_ids') THEN
          ALTER TABLE submissions ADD COLUMN category_ids TEXT NOT NULL DEFAULT '[]';
        END IF;
        UPDATE submissions
        SET category_ids = json_build_array(category_id)::text
        WHERE category_id IS NOT NULL AND category_ids = '[]';
      END IF;
    END $do$
  `;

  // Drop the old compound index (references category_id which will be removed)
  await sql`DROP INDEX IF EXISTS idx_shops_category_active`;

  // Remove category_id column from shops (junction table is the source of truth now)
  await sql`ALTER TABLE shops DROP COLUMN IF EXISTS category_id`;

  // Simple active-only index replaces the old compound index
  await sql`CREATE INDEX IF NOT EXISTS idx_shops_active ON shops(is_active)`;

  // Backfill search_vector for any existing rows (no-op on fresh install)
  await sql`
    UPDATE shops SET search_vector =
      setweight(to_tsvector('german', coalesce(name, '')), 'A') ||
      setweight(to_tsvector('german', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('german', coalesce(shipping, '')), 'C')
    WHERE search_vector IS NULL
  `;

  // Normalize submissions: replace category_id + category_ids with junction table
  await sql`
    CREATE TABLE IF NOT EXISTS submission_categories (
      submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (submission_id, category_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_scat_submission ON submission_categories(submission_id)`;

  // Migrate from legacy single-FK column
  await sql`
    DO $do$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'submissions' AND column_name = 'category_id') THEN
        INSERT INTO submission_categories (submission_id, category_id)
        SELECT id, category_id FROM submissions WHERE category_id IS NOT NULL
        ON CONFLICT DO NOTHING;
      END IF;
    END $do$
  `;

  // Migrate from JSON-array column (may overlap with above – ON CONFLICT handles it)
  await sql`
    DO $do$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'submissions' AND column_name = 'category_ids') THEN
        INSERT INTO submission_categories (submission_id, category_id)
        SELECT s.id, elem::integer
        FROM submissions s,
             jsonb_array_elements_text(s.category_ids::jsonb) AS elem
        WHERE s.category_ids IS NOT NULL
          AND s.category_ids <> '[]'
        ON CONFLICT DO NOTHING;
      END IF;
    END $do$
  `;

  // Drop the now-redundant denormalized columns
  await sql`ALTER TABLE submissions DROP COLUMN IF EXISTS category_ids`;
  await sql`ALTER TABLE submissions DROP COLUMN IF EXISTS category_id`;

  // Migrate shops.region TEXT → JSONB (comma-separated → string array)
  await sql`
    DO $do$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'shops' AND column_name = 'region'
                   AND data_type = 'text') THEN
        ALTER TABLE shops ALTER COLUMN region DROP DEFAULT;
        ALTER TABLE shops
          ALTER COLUMN region TYPE JSONB
          USING CASE
            WHEN region = '' THEN '[]'::jsonb
            ELSE to_jsonb(array_remove(string_to_array(region, ','), ''))
          END;
        ALTER TABLE shops ALTER COLUMN region SET DEFAULT '[]'::jsonb;
      END IF;
    END $do$
  `;

  // Add avatar_url, first_name, last_name to admin_users
  await sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS avatar_url TEXT`;
  await sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS first_name TEXT`;
  await sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_name TEXT`;

  // Add role column and backfill from is_owner
  await sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin'`;
  await sql`UPDATE admin_users SET role = 'owner' WHERE is_owner = true AND role = 'admin'`;

  // Mini CMS: add status + audit columns to content_pages
  await sql`ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'`;
  await sql`ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL`;
  await sql`ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL`;
  await sql`ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL`;
  // Backfill: mark pre-existing seeded pages as published
  await sql`UPDATE content_pages SET status = 'published' WHERE status = 'draft'`;

  // Mini CMS: nav_items table (ON UPDATE CASCADE for slug renames)
  await sql`
    CREATE TABLE IF NOT EXISTS nav_items (
      id        SERIAL PRIMARY KEY,
      nav_id    TEXT NOT NULL,
      page_slug TEXT NOT NULL REFERENCES content_pages(slug) ON DELETE CASCADE ON UPDATE CASCADE,
      position  INTEGER NOT NULL DEFAULT 0,
      label     TEXT,
      UNIQUE(nav_id, page_slug)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_nav_items_nav ON nav_items(nav_id)`;

  // Rename legacy slug 'about' → 'ueber-uns' to match the canonical URL
  await sql`UPDATE content_pages SET slug = 'ueber-uns' WHERE slug = 'about'`;

  // Migrate submissions.region TEXT → JSONB
  await sql`
    DO $do$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'submissions' AND column_name = 'region'
                   AND data_type = 'text') THEN
        ALTER TABLE submissions ALTER COLUMN region DROP DEFAULT;
        ALTER TABLE submissions
          ALTER COLUMN region TYPE JSONB
          USING CASE
            WHEN region = '' THEN '[]'::jsonb
            ELSE to_jsonb(array_remove(string_to_array(region, ','), ''))
          END;
        ALTER TABLE submissions ALTER COLUMN region SET DEFAULT '[]'::jsonb;
      END IF;
    END $do$
  `;

  console.log("Migrations complete.");
  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
