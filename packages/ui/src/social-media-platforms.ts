import type { ComponentType } from "react";
import { FaFacebook, FaTwitter } from "react-icons/fa6";
import {
  SiBluesky,
  SiInstagram,
  SiLinkedin,
  SiMastodon,
  SiPatreon,
  SiPinterest,
  SiThreads,
  SiTiktok,
  SiTwitch,
  SiYoutube,
} from "react-icons/si";

export interface PlatformDef {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

export const PLATFORMS: PlatformDef[] = [
  { key: "mastodon", label: "Mastodon", icon: SiMastodon },
  { key: "bluesky", label: "Bluesky", icon: SiBluesky },
  { key: "instagram", label: "Instagram", icon: SiInstagram },
  { key: "facebook", label: "Facebook", icon: FaFacebook },
  { key: "threads", label: "Threads", icon: SiThreads },
  { key: "tiktok", label: "TikTok", icon: SiTiktok },
  { key: "x", label: "Twitter", icon: FaTwitter },
  { key: "youtube", label: "YouTube", icon: SiYoutube },
  { key: "twitch", label: "Twitch", icon: SiTwitch },
  { key: "linkedin", label: "LinkedIn", icon: SiLinkedin },
  { key: "pinterest", label: "Pinterest", icon: SiPinterest },
  { key: "patreon", label: "Patreon", icon: SiPatreon },
];

export const PLATFORM_MAP = new Map(PLATFORMS.map((p) => [p.key, p]));
