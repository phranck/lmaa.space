import {
  domainAlertRulesConfigSchema,
  parseDomainAlertDomains,
  type DomainAlertRule,
  type DomainAlertRulesConfig,
} from "@lmaa/contracts";
import { SETTINGS_KEYS } from "@lmaa/shared";

import { getSetting } from "../repositories/app-settings.js";

const EMPTY_DOMAIN_ALERT_RULES_CONFIG: DomainAlertRulesConfig = { rules: [] };

function normalizeHostname(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");
}

function getUrlHostname(urlRaw: string): string | null {
  const trimmed = urlRaw.trim();
  const input = trimmed.includes("://") ? trimmed : `https://${trimmed}`;

  try {
    return normalizeHostname(new URL(input).hostname);
  } catch {
    return null;
  }
}

/**
 * Loads the managed submission domain alert config from app settings.
 *
 * @returns Persisted config, or an empty config when the setting is absent or invalid.
 */
async function getManagedDomainAlertRulesConfig(): Promise<DomainAlertRulesConfig> {
  const raw = await getSetting(SETTINGS_KEYS.DOMAIN_ALERT_RULES);
  if (!raw) return EMPTY_DOMAIN_ALERT_RULES_CONFIG;

  try {
    const parsed = domainAlertRulesConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_DOMAIN_ALERT_RULES_CONFIG;
  } catch {
    return EMPTY_DOMAIN_ALERT_RULES_CONFIG;
  }
}

/**
 * Checks whether one active domain alert rule matches a submitted hostname.
 *
 * @param hostname - Full normalized URL hostname, e.g. `www.example.de`.
 * @param registeredDomain - Registered domain from `tldts`, e.g. `example.de`.
 * @param rule - Configured rule to evaluate.
 * @returns `true` when the hostname or registered domain matches the rule list.
 */
export function matchesDomainAlertRule(
  hostname: string,
  registeredDomain: string | null,
  rule: DomainAlertRule,
): boolean {
  if (!rule.isActive) return false;

  const configuredDomains = parseDomainAlertDomains(rule.domainsText);
  const candidates = [normalizeHostname(hostname)];
  if (registeredDomain) candidates.push(normalizeHostname(registeredDomain));

  return configuredDomains.some((domain) =>
    candidates.some((candidate) => candidate === domain || candidate.endsWith(`.${domain}`)),
  );
}

/**
 * Finds the first active domain alert rule matching a submitted shop URL.
 *
 * @param urlRaw - Raw URL entered by a user.
 * @param registeredDomain - Registered domain already extracted for duplicate checks.
 * @returns The first matching rule, or `null` if no managed alert applies.
 */
export async function findMatchingDomainAlertRule(
  urlRaw: string,
  registeredDomain: string,
): Promise<DomainAlertRule | null> {
  const hostname = getUrlHostname(urlRaw);
  if (!hostname) return null;

  const config = await getManagedDomainAlertRulesConfig();
  return (
    config.rules.find((rule) => matchesDomainAlertRule(hostname, registeredDomain, rule)) ?? null
  );
}
