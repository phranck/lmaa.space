-- The automated review runs on one provider, so there is no provider to choose
-- and no row to hold the choice.
DELETE FROM "app_settings" WHERE "key" = 'review.provider';

-- A model saved whilst Mistral was a provider would now be submitted to
-- Anthropic, which refuses an identifier it has never heard of and burns the
-- job's attempts doing it. Removing the row lets the default stand instead.
DELETE FROM "app_settings" WHERE "key" = 'review.model' AND "value" LIKE 'mistral%';
