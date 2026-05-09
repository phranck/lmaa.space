import { z } from "zod";

/** Maximum number of configurable submission domain alert rules. */
export const DOMAIN_ALERT_RULES_MAX = 50;

/** Maximum length for the comma-separated domains field of one rule. */
export const DOMAIN_ALERT_DOMAINS_MAX_LENGTH = 4000;

/** Maximum length for the markdown alert message of one rule. */
export const DOMAIN_ALERT_MESSAGE_MAX_LENGTH = 5000;

function normalizeDomainAlertDomain(input: string): string {
  const withoutScheme = input.trim().toLowerCase().replace(/^https?:\/\//, "");
  const host = withoutScheme.split(/[/?#]/, 1)[0] ?? "";
  return host.replace(/^\.+|\.+$/g, "");
}

function isLikelyDomain(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 253 &&
    value.includes(".") &&
    !/[\s:]/.test(value)
  );
}

/**
 * Parses a comma-separated domain list from the admin UI.
 *
 * @param domainsText - Raw comma-separated domain list.
 * @returns Lowercase, de-duplicated domain names without URL paths or schemes.
 */
export function parseDomainAlertDomains(domainsText: string): string[] {
  const seen = new Set<string>();
  const domains: string[] = [];

  for (const entry of domainsText.split(/[,\n]/)) {
    const domain = normalizeDomainAlertDomain(entry);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    domains.push(domain);
  }

  return domains;
}

/**
 * Schema for one configurable submission domain alert rule.
 */
export const domainAlertRuleSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(120),
    domainsText: z.string().max(DOMAIN_ALERT_DOMAINS_MAX_LENGTH),
    messageMarkdown: z.string().max(DOMAIN_ALERT_MESSAGE_MAX_LENGTH),
    isActive: z.boolean().default(true),
  })
  .superRefine((rule, ctx) => {
    const domains = parseDomainAlertDomains(rule.domainsText);
    if (domains.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["domainsText"],
        message: "At least one domain is required.",
      });
    }

    const invalidDomain = domains.find((domain) => !isLikelyDomain(domain));
    if (invalidDomain) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["domainsText"],
        message: `Invalid domain: ${invalidDomain}`,
      });
    }

    if (rule.messageMarkdown.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["messageMarkdown"],
        message: "A markdown message is required.",
      });
    }
  });

/**
 * Config schema for all configurable submission domain alert rules.
 */
export const domainAlertRulesConfigSchema = z.object({
  rules: z.array(domainAlertRuleSchema).max(DOMAIN_ALERT_RULES_MAX),
});

/** One configurable submission domain alert rule. */
export type DomainAlertRule = z.infer<typeof domainAlertRuleSchema>;

/** Persisted config for all configurable submission domain alert rules. */
export type DomainAlertRulesConfig = z.infer<typeof domainAlertRulesConfigSchema>;
