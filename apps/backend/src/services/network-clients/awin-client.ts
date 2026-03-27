import type { NetworkProgram } from "@lmaa/shared";

import type { NetworkClient } from "./index.js";
import { logger } from "../../lib/logger.js";

const AWIN_API_BASE = "https://api.awin.com";
const REQUEST_TIMEOUT_MS = 15_000;

interface AwinProgramme {
  id: number;
  name: string;
  displayUrl?: string;
  clickThroughUrl?: string;
  relationship?: string;
  primarySector?: { id: number; name: string };
  commissionRange?: string;
  description?: string;
}

/**
 * Awin Publisher API client.
 * Docs: https://developer.awin.com
 */
export class AwinClient implements NetworkClient {
  constructor(
    private publisherId: string,
    private apiToken: string,
  ) {}

  async validateCredentials(): Promise<boolean> {
    try {
      const res = await this.fetch(`/publishers/${this.publisherId}/programmes?relationship=joined`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async searchProgrammes(query?: string): Promise<NetworkProgram[]> {
    const programmes = await this.fetchProgrammes("notJoined");
    if (!query) return programmes;

    const q = query.toLowerCase();
    return programmes.filter(
      (p) =>
        p.programName.toLowerCase().includes(q) ||
        (p.programUrl?.toLowerCase().includes(q) ?? false),
    );
  }

  async getJoinedProgrammes(): Promise<NetworkProgram[]> {
    return this.fetchProgrammes("joined");
  }

  async matchShopToProgram(shopUrl: string): Promise<NetworkProgram | null> {
    const domain = extractDomain(shopUrl);
    if (!domain) return null;

    // Search in notJoined, applied, and joined programmes
    for (const relationship of ["notJoined", "applied", "joined"] as const) {
      const programmes = await this.fetchProgrammes(relationship);
      const match = programmes.find((p) => {
        if (!p.programUrl) return false;
        const progDomain = extractDomain(p.programUrl);
        return progDomain === domain || progDomain?.endsWith(`.${domain}`) || domain.endsWith(`.${progDomain}`);
      });
      if (match) return match;
    }

    return null;
  }

  async getProgrammeStatus(programId: string): Promise<NetworkProgram | null> {
    try {
      const res = await this.fetch(
        `/publishers/${this.publisherId}/programmes/${programId}`,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as AwinProgramme;
      return mapAwinProgramme(data);
    } catch (err) {
      logger.error({ err, programId }, "Awin: failed to get programme status");
      return null;
    }
  }

  private async fetchProgrammes(
    relationship: "notJoined" | "applied" | "joined" | "declined" | "suspended",
  ): Promise<NetworkProgram[]> {
    try {
      const res = await this.fetch(
        `/publishers/${this.publisherId}/programmes?relationship=${relationship}`,
      );
      if (!res.ok) {
        logger.warn({ status: res.status, relationship }, "Awin: failed to fetch programmes");
        return [];
      }
      const data = (await res.json()) as AwinProgramme[];
      return data.map(mapAwinProgramme);
    } catch (err) {
      logger.error({ err, relationship }, "Awin: error fetching programmes");
      return [];
    }
  }

  private fetch(path: string): Promise<Response> {
    return fetch(`${AWIN_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${this.apiToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }
}

function mapAwinProgramme(p: AwinProgramme): NetworkProgram {
  const status = mapRelationship(p.relationship);
  return {
    networkName: "awin",
    programId: String(p.id),
    programName: p.name,
    programUrl: p.displayUrl ?? null,
    applicationUrl: `https://ui.awin.com/merchant/${p.id}/profile`,
    status,
    commissionInfo: p.commissionRange ?? null,
  };
}

function mapRelationship(
  rel?: string,
): NetworkProgram["status"] {
  switch (rel) {
    case "joined": return "joined";
    case "applied": return "applied";
    case "declined": return "declined";
    case "suspended": return "suspended";
    default: return "notJoined";
  }
}

function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
