import { GlobeIcon } from "@phosphor-icons/react";
import type { ComponentType } from "react";
import { FaFacebook, FaTwitter } from "react-icons/fa6";
import {
  SiApplepodcasts,
  SiBluesky,
  SiCodeberg,
  SiDiscord,
  SiGithub,
  SiGitlab,
  SiInstagram,
  SiLinkedin,
  SiMastodon,
  SiMixcloud,
  SiPatreon,
  SiSignal,
  SiSpotify,
  SiTumblr,
  SiPinterest,
  SiSoundcloud,
  SiThreads,
  SiTiktok,
  SiTwitch,
  SiWhatsapp,
  SiXing,
  SiYoutube,
} from "react-icons/si";

import { SOCIAL_PLATFORM_KEYS, type SocialPlatformKey } from "@lmaa/shared";

/** Definition of a social media platform including its display label and icon component. */
export interface PlatformDef {
  key: SocialPlatformKey;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

const PLATFORM_METADATA: Record<SocialPlatformKey, Omit<PlatformDef, "key">> = {
  applepodcasts: { label: "Apple Podcasts", icon: SiApplepodcasts },
  mastodon: { label: "Mastodon", icon: SiMastodon },
  bluesky: { label: "Bluesky", icon: SiBluesky },
  instagram: { label: "Instagram", icon: SiInstagram },
  facebook: { label: "Facebook", icon: FaFacebook },
  whatsapp: { label: "WhatsApp", icon: SiWhatsapp },
  signal: { label: "Signal", icon: SiSignal },
  discord: { label: "Discord", icon: SiDiscord },
  threads: { label: "Threads", icon: SiThreads },
  tiktok: { label: "TikTok", icon: SiTiktok },
  x: { label: "Twitter", icon: FaTwitter },
  youtube: { label: "YouTube", icon: SiYoutube },
  twitch: { label: "Twitch", icon: SiTwitch },
  tumblr: { label: "Tumblr", icon: SiTumblr },
  linkedin: { label: "LinkedIn", icon: SiLinkedin },
  xing: { label: "XING", icon: SiXing },
  pinterest: { label: "Pinterest", icon: SiPinterest },
  patreon: { label: "Patreon", icon: SiPatreon },
  mixcloud: { label: "Mixcloud", icon: SiMixcloud },
  soundcloud: { label: "SoundCloud", icon: SiSoundcloud },
  spotify: { label: "Spotify", icon: SiSpotify },
  github: { label: "GitHub", icon: SiGithub },
  gitlab: { label: "GitLab", icon: SiGitlab },
  codeberg: { label: "Codeberg", icon: SiCodeberg },
  website: { label: "Website", icon: GlobeIcon },
};

/** Ordered list of all supported social media platforms with their display metadata. */
export const PLATFORMS: PlatformDef[] = SOCIAL_PLATFORM_KEYS.map((key) => ({
  key,
  ...PLATFORM_METADATA[key],
}));

/** Map from platform key to its `PlatformDef` for O(1) lookups. */
export const PLATFORM_MAP: ReadonlyMap<string, PlatformDef> = new Map(PLATFORMS.map((p) => [p.key, p]));
