-- The analytics section is gone from the dashboard, so the string that named it
-- is dropped from every sidebar order somebody saved. Reading already filters
-- against the known sections, so this changes no behaviour; it removes the last
-- trace of the feature from the database.
UPDATE "users"
SET "ui_preferences" = jsonb_set(
	"ui_preferences",
	'{sidebarSectionOrder}',
	COALESCE(
		(
			SELECT jsonb_agg("entry")
			FROM jsonb_array_elements("ui_preferences" -> 'sidebarSectionOrder') AS "entry"
			WHERE "entry" <> '"analytics"'::jsonb
		),
		'[]'::jsonb
	)
)
WHERE "ui_preferences" -> 'sidebarSectionOrder' @> '["analytics"]'::jsonb;
