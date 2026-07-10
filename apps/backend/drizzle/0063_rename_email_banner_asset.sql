-- Rename the email banner asset URL: ad/content blockers hide URLs containing
-- "banner", so the masthead image was blocked in emails and in the editor
-- preview. Point existing templates at the renamed, blocker-safe asset.
UPDATE "email_templates"
SET "header_banner_url" = REPLACE("header_banner_url", 'email-banner.jpg', 'email-masthead.jpg')
WHERE "header_banner_url" LIKE '%email-banner.jpg%';
--> statement-breakpoint
UPDATE "email_templates"
SET "footer_banner_url" = REPLACE("footer_banner_url", 'email-banner.jpg', 'email-masthead.jpg')
WHERE "footer_banner_url" LIKE '%email-banner.jpg%';
