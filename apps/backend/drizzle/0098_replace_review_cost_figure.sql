-- The support page names what a check costs. That figure now exists as the
-- `{reviewCost}` site variable, read from the spend ledger, so the sentence
-- names the variable instead of a number somebody has to maintain.
--
-- Matched on the exact sentence rather than on a pattern. An edited page keeps
-- whatever it says, which is the right outcome: a text somebody rewrote is not
-- this text, and replacing part of it would be worse than leaving it alone.
UPDATE "content_pages"
SET "content" = replace("content", '**rund 50 Cent** pro Shop', '**rund {reviewCost}** pro Shop')
WHERE "slug" = 'support-me'
  AND "content" LIKE '%**rund 50 Cent** pro Shop%';
