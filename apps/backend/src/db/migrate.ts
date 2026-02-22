import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

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

  await sql`CREATE INDEX IF NOT EXISTS idx_shops_category ON shops(category_id)`;
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
        setweight(to_tsvector('german', coalesce(NEW.region, '')), 'C') ||
        setweight(to_tsvector('german', coalesce(NEW.shipping, '')), 'D');
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

  // Backfill search_vector for any existing rows (no-op on fresh install)
  await sql`
    UPDATE shops SET search_vector =
      setweight(to_tsvector('german', coalesce(name, '')), 'A') ||
      setweight(to_tsvector('german', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('german', coalesce(region, '')), 'C') ||
      setweight(to_tsvector('german', coalesce(shipping, '')), 'D')
    WHERE search_vector IS NULL
  `;

  console.log("Migrations complete.");
  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
