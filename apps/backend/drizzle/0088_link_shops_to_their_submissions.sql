-- Links every shop that already exists to the suggestion it was admitted from.
-- Admission has only ever copied the address, so the address is what the two
-- rows still have in common. Scheme, a leading "www." and a trailing slash are
-- ignored, because either side may carry them.
--
-- Each shop takes at most one submission and each submission at most one shop,
-- so the unique constraint on the column holds. A pairing that stays ambiguous
-- is left unset rather than guessed.
WITH admitted_suggestions AS (
	SELECT
		id,
		lower(regexp_replace(regexp_replace(shop_url, '^https?://(www\.)?', ''), '/+$', '')) AS address
	FROM submissions
	WHERE status = 'approved'
),
unlinked_shops AS (
	SELECT
		id,
		lower(regexp_replace(regexp_replace(url, '^https?://(www\.)?', ''), '/+$', '')) AS address
	FROM shops
	WHERE submission_id IS NULL
),
one_suggestion_per_shop AS (
	SELECT DISTINCT ON (shop.id)
		shop.id AS shop_id,
		suggestion.id AS submission_id
	FROM unlinked_shops shop
	JOIN admitted_suggestions suggestion ON suggestion.address = shop.address
	ORDER BY shop.id, suggestion.id
),
one_shop_per_suggestion AS (
	SELECT DISTINCT ON (submission_id)
		shop_id,
		submission_id
	FROM one_suggestion_per_shop
	ORDER BY submission_id, shop_id
)
UPDATE shops
SET submission_id = one_shop_per_suggestion.submission_id
FROM one_shop_per_suggestion
WHERE shops.id = one_shop_per_suggestion.shop_id;
