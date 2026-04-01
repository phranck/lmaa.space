import {
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  GraphIcon,
  MinusCircleIcon,
  StorefrontIcon,
} from "@phosphor-icons/react";
import { type ReactNode, createElement } from "react";

import type { AffiliateScanStatus, AffiliateTrackingStatus } from "@lmaa/shared";

export interface StatCardDef {
  key: "total" | AffiliateScanStatus;
  filterValue: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  activeBorder: string;
  activeGlow: string;
}

export const STAT_CARDS: StatCardDef[] = [
  { key: "total", filterValue: "", icon: createElement(StorefrontIcon, { weight: "duotone", className: "w-5 h-5" }), iconBg: "bg-purple-500/12", iconColor: "text-purple-400", activeBorder: "border-purple-400", activeGlow: "shadow-[0_0_12px_rgba(168,85,247,0.35)]" },
  { key: "direct", filterValue: "direct", icon: createElement(CheckCircleIcon, { weight: "duotone", className: "w-5 h-5" }), iconBg: "bg-green-500/12", iconColor: "text-green-400", activeBorder: "border-green-400", activeGlow: "shadow-[0_0_12px_rgba(74,222,128,0.35)]" },
  { key: "network", filterValue: "network", icon: createElement(GraphIcon, { weight: "duotone", className: "w-5 h-5" }), iconBg: "bg-amber-500/12", iconColor: "text-amber-400", activeBorder: "border-amber-400", activeGlow: "shadow-[0_0_12px_rgba(251,191,36,0.35)]" },
  { key: "inquiry", filterValue: "inquiry", icon: createElement(EnvelopeSimpleIcon, { weight: "duotone", className: "w-5 h-5" }), iconBg: "bg-orange-500/12", iconColor: "text-orange-400", activeBorder: "border-orange-400", activeGlow: "shadow-[0_0_12px_rgba(251,146,60,0.35)]" },
  { key: "none", filterValue: "none", icon: createElement(MinusCircleIcon, { weight: "duotone", className: "w-5 h-5" }), iconBg: "bg-zinc-500/10", iconColor: "text-zinc-400", activeBorder: "border-zinc-400", activeGlow: "shadow-[0_0_12px_rgba(161,161,170,0.25)]" },
];

export const STATUS_COLORS: Record<AffiliateScanStatus, string> = {
  direct: "bg-green-500/12 text-green-400",
  network: "bg-amber-500/12 text-amber-400",
  inquiry: "bg-orange-500/12 text-orange-400",
  none: "bg-zinc-500/10 text-zinc-400",
};

export const TRACKING_COLORS: Record<AffiliateTrackingStatus, string> = {
  open: "bg-zinc-500/10 text-zinc-400",
  contacted: "bg-blue-500/12 text-blue-400",
  confirmed: "bg-green-500/12 text-green-400",
  rejected: "bg-red-500/12 text-red-400",
  closed: "bg-purple-500/12 text-purple-400",
};

export const SUPPORTED_NETWORKS = new Set<string>(["Awin", "Tradedoubler", "Adcell"]);
