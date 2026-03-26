import { GlobeIcon } from "@phosphor-icons/react";
import type { ComponentType } from "react";
import { FaFacebook, FaTwitter } from "react-icons/fa6";
import {
  SiBluesky,
  SiInstagram,
  SiLinkedin,
  SiMastodon,
  SiMixcloud,
  SiPatreon,
  SiSpotify,
  SiTumblr,
  SiPinterest,
  SiSoundcloud,
  SiThreads,
  SiTiktok,
  SiTwitch,
  SiYoutube,
} from "react-icons/si";

/** Definition of a social media platform including its display label and icon component. */
export interface PlatformDef {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

/** Ordered list of all supported social media platforms with their display metadata. */
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
  { key: "tumblr", label: "Tumblr", icon: SiTumblr },
  { key: "linkedin", label: "LinkedIn", icon: SiLinkedin },
  { key: "pinterest", label: "Pinterest", icon: SiPinterest },
  { key: "patreon", label: "Patreon", icon: SiPatreon },
  { key: "mixcloud", label: "Mixcloud", icon: SiMixcloud },
  { key: "soundcloud", label: "SoundCloud", icon: SiSoundcloud },
  { key: "spotify", label: "Spotify", icon: SiSpotify },
  { key: "website", label: "Website", icon: GlobeIcon },
];

/** Map from platform key to its `PlatformDef` for O(1) lookups. */
export const PLATFORM_MAP = new Map(PLATFORMS.map((p) => [p.key, p]));
