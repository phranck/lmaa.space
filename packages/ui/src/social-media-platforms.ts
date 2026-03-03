import type { ComponentType } from "react";
import { FaTwitter } from "react-icons/fa6";
import {
  SiBluesky,
  SiInstagram,
  SiLinkedin,
  SiMastodon,
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
  { key: "tiktok", label: "TikTok", icon: SiTiktok },
  { key: "x", label: "Twitter", icon: FaTwitter },
  { key: "youtube", label: "YouTube", icon: SiYoutube },
  { key: "twitch", label: "Twitch", icon: SiTwitch },
  { key: "linkedin", label: "LinkedIn", icon: SiLinkedin },
];

export const PLATFORM_MAP = new Map(PLATFORMS.map((p) => [p.key, p]));
